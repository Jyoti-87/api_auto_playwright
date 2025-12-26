import { test, expect } from '@playwright/test';
test.describe.serial('CARET API flow (small tests)', () => {
 const baseUrl = 'https://qa.zolastaging.com';
 let webTok: string;
 let cookieHeader: string;
 let headers: Record<string, string>;
 let matterId: number;
 let timeEntryId: number;
 test('1) UI Login + build token/cookies', async ({ browser }) => {
   const context = await browser.newContext();
   const page = await context.newPage();
   await page.goto(baseUrl);
   await page.waitForLoadState('networkidle');
   await page.locator('#txtUserName').fill('performance.tester.1@mailinator.com');
   await page.locator('#txtPwd').fill('Success123');
   await page.locator('#loginBtn').click();
   await page.getByRole('img', { name: 'CARET Legal' }).waitFor();
   const cookies = await page.context().cookies();
   webTok = cookies.find(c => c.name === 'web-tok')?.value || '';
   expect(webTok).toBeTruthy();
   cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
   headers = {
     accept: 'application/json, text/javascript, */*; q=0.01',
     authorization: `Bearer ${webTok}`,
     'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
     'x-requested-with': 'XMLHttpRequest',
     'svc-type': 'web',
     Cookie: cookieHeader,
   };
   await context.close();
 });
 test('2) Create Matter (API) -> save matterId', async ({ request }) => {
   const res = await request.post(`${baseUrl}/api2/Matter/`, {
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
       TimeEntryRuleIds: '',
     },
   });
   expect(res.status()).toBe(200);
   // In your case this returns a NUMBER
   const json = await res.json();
   matterId = typeof json === 'number' ? json : Number(json?.id ?? json?.MatterId);
   expect(matterId).toBeTruthy();
   console.log('✅ Matter ID:', matterId);
 });
 test('3) Create Time Entry (API) -> save timeEntryId', async ({ request }) => {
   expect(matterId).toBeTruthy();
   const res = await request.post(`${baseUrl}/api2/time/`, {
     headers,
     form: {
       tien_matterid: String(matterId),
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
       ExcludeFromAllocation: 'false',
     },
   });
   expect(res.status()).toBe(200);
   // Your response is ONLY a number (id)
   const json = await res.json();
   timeEntryId = typeof json === 'number' ? json : Number(json?.tien_id ?? json?.id ?? json?.TimeId);
   expect(timeEntryId).toBeTruthy();
   console.log('✅ Time Entry ID:', timeEntryId);
 });
 test('4) Delete Time Entry (API) using dynamic timeEntryId', async ({ request }) => {
   expect(timeEntryId).toBeTruthy();
   const res = await request.delete(`${baseUrl}/api2/Time/${timeEntryId}`, {
     headers,
   });
   expect(res.status()).toBe(200);
   console.log('🗑️ Time Entry deleted:', timeEntryId);
 });
 // OPTIONAL: Delete Matter (only if you confirm correct endpoint)
 test('5) Delete Matter (API) using dynamic matterId', async ({ request }) => {
   expect(matterId).toBeTruthy();
   const res = await request.delete(`${baseUrl}/api2/DeleteMatter`, {data:`${matterId}`, headers });
   expect(res.status()).toBe(200);
   console.log('🗑️ Matter deleted:', matterId);
 });
 
});