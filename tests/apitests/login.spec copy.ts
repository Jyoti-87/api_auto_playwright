import { test, expect } from '@playwright/test';
import { loginApi } from '../utils/authApi'

test('Login through UI and create matter via API', async ({ browser, request }) => {

const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(
        'https://qa.zolastaging.com'
    );
    // Fill login form
    await page.waitForLoadState('networkidle');
    const username = page.locator('input#txtUserName');
    await username.fill('performance.tester.1@mailinator.com');
    const password = page.locator('input#txtPwd');
    await password.fill('Success123');
    await page.locator('#loginBtn').click();

    // Wait for the CARET Legal logo to ensure login is successful
    await page.getByRole('img', { name: 'CARET Legal' }).waitFor();

    // Validate token exists in cookies
    const cookies = await page.context().cookies();
    const webTok = cookies.find(c => c.name === 'web-tok')?.value;
    await console.log('web-tok cookie value:', webTok);

    const cookieHeader = cookies
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

    await console.log('Cookie Header:', cookieHeader);

    const response = await request.post(
    'https://qa.zolastaging.com/api2/Matter/',
    {
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        authorization: `Bearer ${webTok}`,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'svc-type': 'web',
        // 👇 critical cookie header
        'Cookie': cookieHeader
      },

      form: {
        MatterActiveStatusId: '1',
        MatterName: 'Suits LA',
        MatterOpenDate: '2025/12/17',
        MatterStatusId: '1',
        MatterPracticeAreaId: '30548',
        MatterPracticeArea: 'Business Development',
        MatterClientName: 'Pawnee Parks and Recreation',
        MatterClient: '1398602',
        MatterAttorneyInchargeId: '34705',
        MatterOfficeId: '2919',
        MatterBillingType: '1',
        MatterCurrencyId: '1',
        MatterIsFlatFeeAllocationEnabled: '0',
        MatterIncrement: '6',
        MatterIsRestricted: 'false',
        AdditionalClientInMatterList: '[]',
        CustomUserRates: '[]',
        Originators: '[]',
        Responsible: '[]',
        SelectedUTBMS: '[]',
        PreferredMethod: '0',
        SoftCostRevPercentage: '0.00',
        SplitBilling: 'false',
        InvoicePrintTemplateId: '3172',
        EnablePIModule: 'false',
        ChargeInterest: 'false',
        InterestRate: '0',
        InterestType: '0',
        InterestPeriod: '0',
        InterestGracePeriod: '0',
        TimeEntryRuleIds: ''
      }
    }
  );

  // Status validation
  expect(response.status()).toBe(200);

  // Body validation
  const matterId = await response.json();
  console.log(matterId);

  expect(matterId).toBeDefined();


});


