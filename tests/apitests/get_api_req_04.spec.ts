/*
Test: create booking
Request type: GET
*/

import {test, expect} from '@playwright/test';

test('get booking details by ID -path Param', async({request})=>{
    const bookingId = 1626 ;

    const response =  await request.get(`/booking/${bookingId}`)

    // parse the response and print
    const responseBody = await response.json();
    console.log(responseBody);

    // validate status code
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200)

})