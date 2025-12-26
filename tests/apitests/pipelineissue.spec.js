
 
import { addAnExpenseToAMatter, cleanUpMatterByName, createAMatter, invoiceMatter, logIn, reportCleanupFailed } from '../../lib/node_20_helpers';
import { StreamZip, assert, axios, dateFns, dotenv, expect, faker, getInbox, jsQR, launch, pngjs, saveTrace, test, twilio, xlsx } from '../../qawHelpers';
 
 
test("apply_a_direct_payment_to_a_matter @Pallavi @Batch2", async () => {
  // Step 1. [157569] Apply a direct payment to a matter
  // matter
  const matter = {
    name: "Direct Payment",
    primaryClient: "Pawnee Parks and Recreation",
    practiceArea: "Business Development",
  };
 
  // direct payment obj
  const directPayment = {
    client: matter.primaryClient,
    matter: matter.name,
    paymentMethod: "Cash",
    toAccount: "Undeposited Funds",
    note: faker.lorem.sentence(),
  };
 
  //--------------------------------
  // Arrange:
  //--------------------------------
  // Login to CARET Legal
  const { page } = await logIn({
    email: "caret+applydirectpaymenttomatter@qawolfworkflows.com",
  });
 
  // clean up if needed
  try {
    // clean up if needed
    await cleanUpMatterByName(page, matter.name)
  } catch {
    await reportCleanupFailed()
  }
 
 
  // Helper function to create a new matter
  await createAMatter(page, matter);
 
  // Helper function to add invoice
  let expense = await addAnExpenseToAMatter(page, { type: "Check" });
  await invoiceMatter(page, matter);
 
  // submit for approval
  let total = "$" + expense.amount;
  let frame = await (await page.waitForSelector(`#Iframe7`)).contentFrame();
  const openRow = frame.locator(`tbody tr:has-text("$${expense.amount}")`);
 
  // Extract the matter id
  const matterId = await page.locator(`[id="slct2_matter_list"]`).innerHTML();
  console.log(matterId)
 
  //--------------------------------
  // Act:
  //--------------------------------
  // click "+" in header
  frame = await (await page.waitForSelector(`#Iframe7`)).contentFrame();
  await frame.locator(".accounting-create-new-icon").click();
 
  // click Apply Direct Payment
  await frame.locator(`.apply-payment`).click();
 
  // Fill out Direct Payment Modal
  let modal = page.locator(`[aria-describedby="direct-deposit-dlg"]`);
 
  // -- Client Select
  await modal
    .locator(`label:has-text("Client") + div .select2-container`)
    .click();
  await page.getByRole("option", { name: directPayment.client }).click();
 
  // -- Matter Select
  await modal
    .locator(`label:has-text("Matter") + div .select2-container`)
    .click();
  await page.keyboard.type(matterId);
  await page.getByRole("option", { name: matterId }).first().click();
 
  // -- Payment Amount
  await modal
    .locator(`label:has-text("Payment Amount") + div #bptxtDepositAmount`)
    .fill(expense.amount);
 
  // -- To Account
  await modal
    .locator(`label:has-text("To Account") + a + div .select2-container`)
    .click();
  await page.getByRole("option", { name: directPayment.toAccount }).click();
 
  // -- Payment Method
  await modal
    .locator(`label:has-text("Payment By") + div .select2-container:visible`)
    .click();
  await page.getByRole("option", { name: directPayment.paymentMethod }).click();
 
  // -- Note
  await modal
    .locator(`label:has-text("Notes") + textarea`)
    .fill(directPayment.note);
 
  // -- Check all invoices
  await modal.locator(`[data-bind*="toggleSelectAll"]`).check();
 
  // Submit
  await modal.locator(`button:has-text("Apply & Close")`).click();
  //--------------------------------
  // Assert:
  //--------------------------------
  // Success toast message
  await expect(
    page.locator(`.toast-success:has-text("Recorded a new deposit")`),
  ).toBeVisible();
  await expect(
    page.locator(`.toast-success:has-text("Recorded a new deposit")`),
  ).not.toBeVisible();
 
  // Check if invoice was paid
  await frame.locator(`#btnPaid`).click();
  await expect(openRow).toBeVisible();
 
  // Check if details is saved
  const [invoiceTab] = await Promise.all([
    page.waitForEvent("popup"),
    openRow.locator(`[onclick*="onClickOfInvoice"]`).first().click(),
  ]);
  await invoiceTab.waitForLoadState("domcontentloaded");
  invoiceTab.once("dialog", (dialog) => {
    dialog.accept().catch((err) => {
      console.error("Failed to accept dialog:", err);
    });
  });
 
  // -- Payment is visible
  await expect(
    invoiceTab.locator(
      `[data-bind="foreach: nonDeletedPayments()"] .line-item:has-text("${directPayment.note}")`,
    ),
  ).toBeVisible();
  let testRow = invoiceTab.locator(
    `[data-bind="foreach: nonDeletedPayments()"] .line-item:has-text("${directPayment.note}")`,
  );
 
  // -- Date Recieved
  let today = dateFns.format(new Date(), "MM/dd/yyyy");
  await expect(testRow.locator(`.det__date`).first()).toHaveText(today);
 
  // -- Date Applied
  await expect(testRow.locator(`.det__date`).nth(1)).toHaveText(today);
 
  // -- Amount
  await expect(testRow.locator(`.det__total`)).toHaveText("$" + expense.amount);
 
  // -- To Account
  await expect(testRow.locator(`.det__to-account`)).toHaveText(
    directPayment.toAccount,
  );
 
  // -- Payment Method
  await expect(testRow.locator(`.det__payment-method`)).toHaveText(
    directPayment.paymentMethod,
  );
 
  // -- Notes
  await expect(testRow.locator(`.det__notes`)).toHaveText(directPayment.note);
 
  // CLEAN UP
  // -- Clean up payment & Invoice
  await invoiceTab.locator(`[data-bind="visible: isDirect()"]`).click();
  await invoiceTab.locator(`.m-action-list`).click();
  await invoiceTab.locator(`li:has-text("Delete")`).click();
  await invoiceTab.close();
 
  // -- Clean Up matter
  // clean up if needed
  try {
    // clean up if needed
    await cleanUpMatterByName(page, matter.name)
  } catch {
    await reportCleanupFailed()
  }
 
});
 
Password: a6vFn1Lo2
 
 
/**
 * Cleans up all instance of matter by name
 * @param {Object} page - page instance
 * @param {String} matter name - matter name that will be deleted
 */
export async function cleanUpMatterByName(page, matterName) {
  // Navigate to matter dashboard
  await page.locator(`#navigation [href="/Matters/MatterList2.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // Allow table to load
 
  // Search for matter name
  await page
    .locator(`#page-search`)
    .pressSequentially(matterName, { delay: 25 });
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.locator(`#matter-view-loading-overlay img`).waitFor({
    state: "hidden",
    timeout: 2 * 60 * 1000,
  });
 
  if (
    await isVisible(
      page,
      `table .matter-grid-row:has-text("${matterName}")`,
      5000,
    )
  ) {
    let previousCount = 0;
    let currentCount = await page
      .locator(`table .matter-grid-row:has-text("${matterName}")`)
      .count();
 
    while (currentCount > 0) {
      // Break if no more matters exist or deletion is not progressing
      if (currentCount === 0 || currentCount === previousCount) break;
 
      previousCount = currentCount;
 
      // Accept confirmation dialog
      page.once("dialog", (dialog) => void dialog.accept());
 
      // Click delete
      await page
        .locator(
          `table .matter-grid-row:has-text("${matterName}") .zola-icon-trash`,
        )
        .first()
        .click();
 
      // Wait for success toast message
      await expect(
        page.locator(`.toast-success:has-text("Matter successfully deleted")`),
      ).toBeVisible();
      await page
        .locator(`.toast-success:has-text("Matter successfully deleted")`)
        .click();
      await page.waitForTimeout(2000);
      await expect(
        page.locator(`.toast-success:has-text("Matter successfully deleted")`),
      ).not.toBeVisible();
 
      // Wait for loading overlay to disappear
      await expect(
        page.locator(`div#matter-view-loading-overlay-child img`),
      ).not.toBeVisible({ timeout: 2 * 60 * 1000 });
 
      // Refresh search results
      await page.locator(`#page-search`).fill(matterName);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      await page.locator(`#matter-view-loading-overlay img`).waitFor({
        state: "hidden",
        timeout: 3 * 60 * 1000,
      });
 
      // Update currentCount after deletion
      currentCount = await page
        .locator(`table .matter-grid-row:has-text("${matterName}")`)
        .count();
    }
  }
}
 
 
export async function reportCleanupFailed({ dedupKey, errorMsg } = {}) {
  const payload = {
    runId: process.env.QAWOLF_RUN_ID,
    teamId: process.env.QAWOLF_TEAM_ID,
    workflowId: process.env.QAWOLF_WORKFLOW_ID,
    suiteId: process.env.QAWOLF_SUITE_ID,
    dedupKey,
    errorMsg,
  };
 
  // prevents alerts when running in editor (RUN_ID will be undefined)
  if (!payload.runId) return;
 
  console.log(payload);
  await fetch("https://qawolf-automation.herokuapp.com/apis/cleanup-fail", {
    body: JSON.stringify(payload),
    contentType: "application/json",
    method: "POST",
  });
}
export async function addNewTaskToALead(page, newTask) {
  // Click task tab
  await page.locator(`.rtsLink:has-text("Tasks")`).click();
 
  // Click the plus icon in the Tasks section
  await page.locator(`[data-bind="click: $root.newTask"]`).click();
 
  // Locate the modal and save it to a variable
  const modal = page.locator(`[aria-describedby="newTaskForm"]`);
 
  // -- Subject
  await modal.locator(`#task-name`).fill(newTask.subject);
 
  // -- Description
  await modal.locator(`#task-desc`).fill(newTask.description);
 
  // -- Tag
  await modal.locator(`label:has-text("Tags") + .select2-container`).click();
  await page.keyboard.type(newTask.tag);
  await page.keyboard.press("Enter");
 
  // -- Due Date
  await modal
    .locator(`#task-due-date-picker`)
    .fill(`${newTask.dueDate} 11:30 PM`);
 
  // Click "Save & Close"
  await page
    .locator(`[data-bind="visible: !isUpdate(), click: saveTaskEntry"]`)
    .click();
}

 
/**
 * Creates a Matter
 * @param {Object} page - page instance
 * @param {Object} :
 *    -- Basic Matter includes name, primaryClient, practiceArea, invoiceTemplate
 */
export async function createAMatter(page, matter = {}, submit = true) {
  // kick out if matter doesnt have minimum
  if (!matter.name) {
    throw new Error(`🛑 Matter must have a name 🛑`);
  } else if (!matter.primaryClient) {
    throw new Error(`🛑 Matter must have a primary client 🛑`);
  } else if (!matter.practiceArea) {
    throw new Error(`🛑 Matter must have a practice area 🛑`);
  }
 
  // Click the plus icon in the navbar
  await page.locator(`#dashboard [href="/Dashboard/Dashboard.aspx"]`).click();
  await page.locator(`#cw-quick-add-button`).click();
 
  // Select "New Matter" from the dropdown
  await page.locator(`a[href="/Matters/NewMatter.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("load");
 
  // wait an additional 5 seconds
  await page.waitForTimeout(5_000);
 
  // -- Name
  await page.locator(`#new-matter__matter-name`).fill(matter.name);
 
  // -- Primary Client
  await page.locator('[id*="new-matter-primary-client"]:visible').click();
  await page.keyboard.type(matter.primaryClient, { delay: 300 });
  await page
    .getByRole("option", { name: matter.primaryClient, exact: true })
    .click();
 
  // -- Responsible Attorney
  if (matter.responsibleAttorney) {
    await page.locator(`.initials-user-dropdown-length-1`).first().click();
    await page
      .locator(`#select2-drop [placeholder=""]`)
      .fill(matter.responsibleAttorney);
    await page
      .locator(`[role="option"] :text("${matter.responsibleAttorney}")`)
      .click();
  }
 
  // -- Originating Attorney
  if (matter.originatingAttorney) {
    await page
      .locator(`label:has-text("Originating Attorney") + .select2-container`)
      .click();
    await page
      .getByRole("option", { name: matter.originatingAttorney })
      .click();
  }
 
  // -- Primary Area
  await page.locator('[id*="new-matter-practice-area"]:visible').click();
  await page.keyboard.type(matter.practiceArea);
  await page
    .getByRole("option", { name: matter.practiceArea, exact: true })
    .click();
 
  // template invoices
  if (!matter.invoiceTemplate) {
    matter.invoiceTemplate = "Default";
  }
  await page
    .locator(
      `.billing-inner-item:has-text("Invoice templates") [id*="select"]:visible`,
    )
    .click();
  await page.keyboard.type(matter.invoiceTemplate);
  await page
    .getByRole("option", { name: matter.invoiceTemplate, exact: true })
    .click();
 
  // -- User Rate
  if (matter.user && matter.userRate) {
    // Click the plus icon for a new User Rate -- Currently not in view if debugging (change zoom to 90%)
    await page.locator(`#matter-user-rates-section [value="+"]`).click();
 
    // Fill out new User and User Rate and save
    await page
      .locator(`[data-bind*="userRatesList"] [data-bind*="numericInput"]`)
      .fill(matter.userRate);
 
    await page
      .locator(`[data-bind*="userRatesList"] [id*="select"]:visible`)
      .click();
    await page.keyboard.type(matter.user);
    await page.getByRole("option", { name: matter.user }).click();
 
    await page
      .locator(`[data-bind*="userRatesList"] [data-bind*="saveUserRate"]`)
      .click();
  }
 
  // -- Time Entry Rule
  if (matter.timeEntryRule) {
    // Click the plus icon for a new "Time Entry Rule" -- Currently not in view if debugging (change zoom to 90%)
    await page.locator(`#time-entry-rule-section [value="+"]`).click();
 
    // Fill out new Time Entry Rule
    await page
      .locator(`[data-bind*="timeEntryRuleList"] [id*="select"]:visible`)
      .click();
    await page.keyboard.type(matter.timeEntryRule);
    await page.getByRole("option", { name: matter.timeEntryRule }).click();
    await page.locator(`[data-bind*="saveTimeEntryRule"]`).click(); // click check mark to save
  }
  // -- billingType
  if (matter.billingType) {
    await page
      .locator("div.cw-form-group.billing-inner-item .select2-choice")
      .first()
      .click();
    await page.keyboard.type(matter.billingType);
    await page.getByRole("option", { name: matter.billingType }).click();
  }
 
  if (matter.allocateFlatFeesChecked) {
    await page.locator(`#chk-flat-fee-enabled`).click();
  }
 
  // -- Split Billing
  if (matter.splitBilling) {
    await page.locator(`#tgSplitBilling`).click();
  }
 
  // -- Other Contact
  if (matter.otherContact && matter.otherContactRole) {
    await page.locator(`[data-bind*="addOtherContact"]`).click();
 
    // Fill out Other User
    await page
      .locator(`[data-bind*="otherContactsList"] .select2-choice`)
      .first()
      .click();
    await page.keyboard.type(matter.otherContact);
    await page.getByRole("option", { name: matter.otherContact }).click();
 
    await page
      .locator(`[data-bind*="otherContactsList"] .select2-choice`)
      .nth(1)
      .click();
    await page.keyboard.type(matter.otherContactRole);
    await page.getByRole("option", { name: matter.otherContactRole }).click();
    await page.locator(`[data-bind*="saveOtherContact"]`).click(); // click checkmark to save
  }
  if (matter.permissionUserOrGroup) {
    await page
      .locator(`input[name="matter-permissions"][value="custom"]`)
      .first()
      .click();
    await page.locator(`.user-custom-list-multiple ul`).first().click();
    await page.keyboard.type(matter.permissionUserOrGroup, { delay: 250 });
    await page
      .locator(`.select2-result li:has-text('${matter.permissionUserOrGroup}')`)
      .click();
  }
  if (matter.deliveryPreference) {
    try {
      await page.getByRole(`link`, { name: `Email PDF` }).click();
    } catch {
      await page
        .locator(`#s2id_nm_prf`)
        .getByRole(`link`, { name: `-Type or Select-` })
        .click();
    }
    await page.keyboard.type(`${matter.deliveryPreference}`);
    await page
      .getByRole(`option`, { name: `${matter.deliveryPreference}` })
      .locator(`span`)
      .click();
  }
  if (matter.toggleLedesBillingOptions) {
    await page.getByLabel(`Enable UTBMS Codes for LEDES Billing`).click();
    await page.getByLabel(`ABA Bankruptcy`).click();
    await page.getByLabel(`ABA Counselling`).click();
    await page.getByLabel(`ABA Litigation`).click();
    await page.getByLabel(`ABA Project`).click();
    await page.getByLabel(`EW Civil Litigation`).click();
    await page.getByLabel(`LOC eDiscovery`).click();
    await page.getByLabel(`LOC Trademark`).click();
    await page.getByLabel(`LOC Patent`).click();
  }
 
  // -- submit matter
  if (submit) {
    await page.locator(`#create-matter-button`).click({ timeout: 50_000 });
  } else {
    console.warn(`🟡 Matter has not been sumbitted 🟡`);
    return matter;
  }
 
  // Wait 3 minutes for the url to have "/MatterDetailInfo.aspx"
  await expect(async () => {
    try {
      await expect(page).toHaveURL(/MatterDetailInfo.aspx/);
    } catch {
      // If after 30 secs, the url haven't changed, check if there is the duplicate modal pops up
      if (
        await page
          .locator("#duplicate-matter-number-modal")
          .getByText(
            "There already exists a matter with potentially the same matter number.",
          )
          .isVisible()
      ) {
        // Handle the duplicate modal
        try {
          await page
            .locator(
              '#duplicate-matter-number-modal a:has-text("Create Anyway")',
            )
            .click({ timeout: 5 * 1000 });
        } catch {
          // No action required, looks like there was no duplciate matter and UI was just slow
        }
      }
      // Check if the URL changed now
      await expect(page).toHaveURL(/MatterDetailInfo.aspx/, {
        timeout: 20_000,
      });
    }
  }).toPass({ timeout: 3 * 60 * 1000 });
 
  await page.waitForLoadState("domcontentloaded");
 
  // grab matter No
  await page.waitForTimeout(15_000);
  // additional temporary due to slow matter creation in firm 1
  const matterNo = await page
    .locator("#matterNo")
    .innerText({ timeout: 60_000 });
 
  return {
    matter,
    matterNo,
  };
}
 
 
/**
 * Add an expense to a matter
 * @param {Object} page - page instance
 * @param {Object} expense:
 *  -- required: type
 */
 
export async function addAnExpenseToAMatter(page, expense, matter) {
  const { dateFns, faker } = npmImports;
  // Data validation
  if (!expense.type) {
    throw new Error(
      `🛑 Expense must have a type 🛑 ("Check", "Expense", or "Credit Card")`,
    );
  }
 
  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();
 
  // Click on the "Expenses" section
  const frame = await (await page.waitForSelector("#Iframe6")).contentFrame();
  await frame.locator(`#expenses`).click();
 
  // Click the plus icon in the section header
  await frame.locator(`#add-expense-entry`).click();
 
  switch (expense.type) {
    case "Check":
      // Populate expense object with defaults if needed
      if (!expense.account) expense.account = "Operating Account";
      if (!expense.payableTo) expense.payableTo = "Leslie Knope";
      if (!expense.street) expense.street = "123 Main St.";
      if (!expense.city) expense.city = "Seattle";
      if (!expense.state) expense.state = "WA";
      if (!expense.zipCode) expense.zipCode = "98101";
      if (!expense.memo) expense.memo = faker.lorem.sentence();
      if (!expense.date)
        expense.date = dateFns.format(new Date(), "MM/dd/yyyy");
      if (!expense.amount)
        expense.amount = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();
      if (!expense.assignedAccount)
        expense.assignedAccount = "Accounts Receivable";
      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.sampleFile) expense.sampleFile = "avatar.png";
 
      // Click the option "New Check (hard-cost)"
      await frame
        .locator(`.drp-down-option a:has-text("New Check (hard-cost)")`)
        .click();
 
      // Fill all input fields from the details object
      // -- New Check Account
      await page
        .locator('label:has-text("Account") + .new-chk__cell a')
        .click();
      await page.getByRole("option", { name: expense.account }).click();
 
      // -- Payable to
      await page
        .locator(
          'label:has-text("Payable To") + .new-chk__select-flt .select2-choice',
        )
        .click();
      await page.keyboard.type(expense.payableTo);
      await page.getByRole("option", { name: expense.payableTo }).click();
 
      // -- Address
      await page.locator(`.new-chk__streetaddress`).fill(expense.street);
      await page.locator(`.new-chk__city`).fill(expense.city);
      await page.locator(`.new-chk__state`).fill(expense.state);
      await page.locator(`.new-chk__zip`).fill(expense.zipCode);
 
      // -- Date
      await page
        .locator(
          `[for="new-chk-datepicker"] + .new-chk__date .k-datepicker .k-select`,
        )
        .click();
      await page.locator("#new-chk-datepicker").fill(expense.date);
 
      // -- Amount
      await page
        .locator(
          '.new-chk__box_right label:has-text("Amount") + div [data-bind*="numericInput"]',
        )
        .fill(expense.amount);
 
      // -- Memo
      await page.locator(`.new-chk__memo`).fill(expense.memo);
 
      // -- Assign Account
      await page.getByRole("link", { name: "Select..." }).click();
      await page.getByRole("option", { name: expense.assignedAccount }).click();
 
      // -- Description
      await page
        .locator(`.line-item .det__desc textarea`)
        .fill(expense.description);
 
      // -- Attachment
      page.once(
        "filechooser",
        async (chooser) =>
          await chooser.setFiles(`/home/wolf/files/${expense.sampleFile}`),
      );
      await page.click("#new-check-document-file-input");
 
      // Click "Save & Close"
      await page
        .locator(`#new-check-dlg [type="submit"]:has-text("Save & Close")`)
        .click();
 
      // Assert "Check created successfully!" toast notification
      await expect(
        page.locator(
          `div.toast-message:has-text("Check created successfully!")`,
        ),
      ).toBeVisible();
      await expect(
        page.locator(
          `div.toast-message:has-text("Check created successfully!")`,
        ),
      ).not.toBeVisible();
      return expense;
 
    case "Expense":
      // Populate expense object with defaults if needed
      if (!expense.softCostType && expense.softCostType !== false) {
        expense.softCostType = "QA";
      }
 
      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.quantity)
        expense.quantity = faker.datatype
          .number({ min: 1, max: 20 })
          .toString();
      if (!expense.price)
        expense.price = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();
 
      // Click the option "New Expense (soft-cost)"
      await frame.locator(`a:has-text("New Expense (soft-cost)")`).click();
 
      // Fill all input fields from the details object
      // Fill out soft cost type
      // Fill out soft cost type only if it's not false
      if (expense.softCostType !== false) {
        await page
          .locator(
            `b[role="presentation"]:below(label:has-text("Soft Cost Type")):visible >> nth=0`,
          )
          .click();
 
        await page
          .locator(`input.select2-input:visible`)
          .fill(expense.softCostType);
        await page.getByRole("option", { name: expense.softCostType }).click();
      }
 
      // Fill out description
      await page.locator(`#sc_SoftCostDesc`).fill(expense.description);
 
      // Fill out quantity
      await page.locator(`#sc_SoftCostQtn`).fill(String(expense.quantity));
 
      // Fill out unit price
      await page.locator(`#sc_SoftCostPrice`).fill(String(expense.price));
 
      // Click "Save & Close"
      await page.locator(`#scBtnSave:visible`).click();
 
      // Assert "New expense was added successfully!" toast notification is visible
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).toBeVisible();
      await page
        .locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        )
        .click();
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).not.toBeVisible();
      return expense;
 
    case "Credit Card": {
      {
        // Populate expense object with defaults if needed
        if (!expense.account) expense.account = "QA Wolf Card 1";
        if (!expense.payableTo) expense.payableTo = "Leslie Knope";
        if (!expense.memo) expense.memo = faker.lorem.sentence();
        if (!expense.amount)
          expense.amount = faker.datatype
            .number({ min: 10, max: 99, precision: 0.01 })
            .toString();
        if (!expense.assignedAccount1)
          expense.assignedAccount1 = "Accounts Receivable";
        if (!expense.assignedAccount2)
          expense.assignedAccount2 = "Accumulated Depreciation";
        if (!expense.description1)
          expense.description1 = faker.lorem.sentence();
        if (!expense.description2)
          expense.description2 = faker.lorem.sentence();
        if (!expense.sampleFile) expense.sampleFile = "avatar.png";
 
        // Click the option "New Credit Card (hard-cost)"
        await frame
          .locator(`.invoice-options a:has-text("New Credit Card (hard-cost)")`)
          .click();
 
        // Click the plus icon in the "Assign Accounts & Matters" section
        try {
          await page
            .locator(`input[type="button"]:visible`)
            .click({ timeout: 5 * 1000 });
        } catch {
          await page.keyboard.press("Escape");
          await page.locator(`input[type="button"]:visible`).click();
        }
 
        // Fill out all fields with the input object
        // -- Account
        await page
          .locator(`b:below(label[for="new-creditcard-accounts"]) >> nth=0`)
          .click();
        await page.keyboard.type(expense.account);
        await page.getByRole("option", { name: expense.account }).click();
        // -- Payable To
        await page
          .locator(`b:below(label:text-is("Payable To"):visible) >> nth=0`)
          .click();
        await page.keyboard.type(expense.payableTo);
        await page.getByRole("option", { name: expense.payableTo }).click();
        // -- Memo
        await page.locator(`input.new-creditcard__memo`).fill(expense.memo);
        // -- Amount
        await page.locator(`input#new-creditcard-amount`).fill(expense.amount);
 
        // -- Account 1
        let accountLine1 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=0`,
        );
        // -- -- Assigned Account
        await accountLine1.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount1}")`,
          )
          .click();
        // -- -- Description
        await accountLine1.locator(`textarea`).fill(expense.description1);
        // -- -- Amount
        await accountLine1
          .locator(`input.num-field`)
          .fill(String((Number(expense.amount) - 1).toFixed(2)));
 
        // -- Account 2
        const accountLine2 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=1`,
        );
 
        // -- -- Assigned Account
        await accountLine2.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount2}")`,
          )
          .click();
        // -- -- Description
        await accountLine2.locator(`textarea`).fill(expense.description2);
        // -- -- Amount
        await accountLine2.locator(`input.num-field`).fill("1.00");
        // -- -- Matter
        await accountLine2.locator(`#s2id_nc-matter-dp`).click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1000);
        await page.getByRole("option", { name: `${matter.name}` }).click();
 
        // Upload a sample file
        page.once("filechooser", (chooser) => {
          chooser
            .setFiles(`/home/wolf/files/${expense.sampleFile}`)
            .catch(console.error);
        });
        await page.click("div.accounting-modal-document-attach-btn:visible");
 
        // Click "Save & Close"
        await page.locator(`button:has-text("Save & Close"):visible`).click();
 
        // Assert "Credit Card created successfully!" toast notification is visible
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).toBeVisible();
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).not.toBeVisible();
        return expense;
      }
    }
    default:
      throw new Error(
        `🛑 Invalid Type! Must be: "Check", "Expense", or "Credit Card" 🛑`,
      );
  }
}
 
export async function invoiceMatter(page, matter, options = {}) {
  const { dateFns } = npmImports;
  const { stayOnPage = false } = options;
  let frame;
 
  // Wait for page to be ready before clicking tabs
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
 
  await expect(async () => {
    // Click on the "Time/Expenses" tab
    await page.locator(`.rtsLI:has-text("Time/Expenses")`).click({ timeout: 10000 });
    await page.locator("#Iframe6").waitFor({ state: 'attached' });
    // grab iframe
    frame = await page.frameLocator("#Iframe6");
  }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });
 
  // Wait for iframe content to be ready
  await page.waitForTimeout(2000);
 
  // Click on the "Time Entries" section
  await frame.locator(`a#time-entries`).click();
 
  // Click the "Invoice Unbilled Activities" icon
  await frame.locator(`a#openUnbilledInvoicesBtn`).click();
 
  await page.waitForLoadState("domcontentloaded");
 
  await page.waitForTimeout(12_000);
 
  // Select "Manually select Items"
  await page
    .getByRole(`radio`, { name: `Manually select Items` })
    .click({ timeout: 4000 })
    .catch(console.error);
 
  // check all & generate invoice
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(8_000);
  await page.waitForLoadState("domcontentloaded");
 
  await page.locator(`#hoursrange`).click();
  await page.getByRole(`listitem`).filter({ hasText: `Today` }).first().click();
  await page.locator(`#hoursrange`).click();
  await page.getByRole(`listitem`).filter({ hasText: `Show All` }).click();
  await page.locator(`#chkToggleAll`).click();
  await page.getByRole(`button`, { name: `Generate Invoice` }).click();
 
  if (options.invoiceDate) {
    let days = options.invoiceDate;
    await page
      .locator(`label:has-text("Invoice Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
    await page.waitForTimeout(2_000);
  }
  if (options.dueDate) {
    let days = options.dueDate;
    let date = dateFns.format(
      new Date().setDate(new Date().getDate() + days),
      "MM/dd/yyyy",
    );
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(date);
    await page.mouse.click(0, 0);
  }
  if (options.pastDueDate) {
    let days = options.pastDueDate;
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .click();
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
  }
 
  await page
    .getByLabel(`Generate Invoice`)
    .getByText(`Generate`, { exact: true })
    .click();
 
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).toBeVisible();
  let splitInvoice = await page.locator(`.toast-success`).innerText();
  let invoiceNo = splitInvoice.split(": ")[1];
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).not.toBeVisible();
 
  if (stayOnPage === true) {
    await page.goBack();
    await page.waitForLoadState("domcontentloaded");
    await page
      .locator(`.rtsLI:has-text("Invoices")`)
      .waitFor({ timeout: 3 * 60 * 1000 });
    await page.waitForTimeout(3000);
    // Click on the "Invoices" tab
    await page
      .locator(`.rtsLI:has-text("Invoices")`)
      .click({ timeout: 1 * 60 * 1000 });
    return { invoiceNo: invoiceNo.replace(/\.$/, "") };
  }
 
  await goToMatter(page, matter.name);
 
  // Click on the "Invoices" tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();
 
  return { invoiceNo: invoiceNo.replace(/\.$/, "") };
}
 