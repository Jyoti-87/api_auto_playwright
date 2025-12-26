import { test, expect } from '@playwright/test';

test('CARET full API flow (all in one spec)', async ({ browser, request }) => {
 const baseUrl = 'https://qa.zolastaging.com';

 /* ===============================
    1️ UI LOGIN
    =============================== */
 const context = await browser.newContext();
 const page = await context.newPage();

 await page.goto(baseUrl);
 await page.waitForLoadState('networkidle');

 await page.locator('#txtUserName').fill('performance.tester.1@mailinator.com');
 await page.locator('#txtPwd').fill('Success123');
 await page.locator('#loginBtn').click();

 // Login validation
 await page.getByRole('img', { name: 'CARET Legal' }).waitFor();

 /* ===============================
    2️ EXTRACT TOKEN + COOKIES
    =============================== */
 const cookies = await page.context().cookies();

 const webTok = cookies.find(c => c.name === 'web-tok')?.value;
 expect(webTok).toBeDefined();

 const cookieHeader = cookies
   .map(c => `${c.name}=${c.value}`)
   .join('; ');

 const headers = {
   accept: 'application/json, text/javascript, */*; q=0.01',
   authorization: `Bearer ${webTok}`,
   'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
   'x-requested-with': 'XMLHttpRequest',
   'svc-type': 'web',
   Cookie: cookieHeader
 };

 /* ===============================
    3️ CREATE MATTER (API)
    =============================== */
 const createMatterResponse = await request.post(
   `${baseUrl}/api2/Matter/`,
   {
     headers,
     form: {
       MatterActiveStatusId: '1',
       MatterName: `Suits LA ${Date.now()}`,
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

 expect(createMatterResponse.status()).toBe(200);

 const matterId = await createMatterResponse.json(); // response is NUMBER
 console.log(' Matter ID:', matterId);

 expect(typeof matterId).toBe('number');

 /* ===============================
    4️ CREATE TIME ENTRY (API)
    =============================== */
 const createTimeResponse = await request.post(
   `${baseUrl}/api2/time/`,
   {
     headers,
     form: {
       tien_matterid: String(matterId), //  dynamic
       tien_matteruserid: '34701',
       tien_timetype: '2',
       tien_workdate: '12/24/2025 1:33 PM',
       tien_duration: '5400',
       tien_worktypeid: '5897',
       tien_worktypeIsUTBMS: 'false',
       tien_rate: '0.00',
       tien_total: '123',
       tien_actualduration: '5400',
       tien_isHiustorical: 'false',
       tien_isNoCharge: 'true',
       tien_isNcds: 'false',
       tien_isAdmin: 'false',
       tien_isSplit: 'false',
       tien_splitUsers: '[]',
       ExcludeFromAllocation: 'false'
     }
   }
 );

 expect(createTimeResponse.status()).toBe(200);

 const timeEntryId = await createTimeResponse.json(); // response is NUMBER
 console.log('⏱ Time Entry ID:', timeEntryId.tien_id);

//  expect(typeof timeEntryId).toBe('number');

 /* ===============================
    5️⃣ DELETE TIME ENTRY (API)
    =============================== */
 const deleteTimeResponse = await request.delete(
   `${baseUrl}/api2/Time/${timeEntryId.tien_id}`,
   {headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        authorization: `Bearer ${webTok}`,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'svc-type': 'web',
        'Cookie': cookieHeader
   }}
)
 expect(deleteTimeResponse.status()).toBe(200);
 console.log(' Time Entry deleted:', timeEntryId.tien_id);

//  Delete Specific Matter

 const deleteMatterIdResponse = await request.delete(
    `${baseUrl}/api2/DeleteMatter`,
    {data: `${matterId}`  ,
        headers: {
         accept: 'application/json, text/javascript, */*; q=0.01',
            authorization: `Bearer ${webTok}`,
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            'svc-type': 'web',
            'Cookie': cookieHeader
    }}
 )
 expect(deleteMatterIdResponse.status()).toBe(200);
 expect(await deleteMatterIdResponse.json()).toBe(true);
 console.log("matter response", await deleteMatterIdResponse.json());
 console.log(' Matter deleted:', matterId);

// Logout API call
 const logOutApp= await request.post( 
   `${baseUrl}/api2/auth/logout`,
   { headers }
 );
 expect(logOutApp.status()).toBe(200);
 console.log('Logout successful');

})