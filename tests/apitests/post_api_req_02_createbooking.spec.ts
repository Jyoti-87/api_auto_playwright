/*
Test: create booking
Request type: Post
Request body: json

Add url to playwright.config.ts file
	baseURL: 'https://restful-booker.herokuapp.com'
 
 
*/

import { test, expect } from "@playwright/test"
import fs from "fs";

test("Create Post request using json body", async({ request }) => {

    //request body
    const jsonFile="testdata/post_request_body.json";
    const requestBody=JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    // send post request

    const response= await request.post("/booking",{data:requestBody});

    const responseBody= await response.json()  // Extractred response
    console.log(responseBody);
    
    //validate status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    //validate response body attributes
    expect(responseBody).toHaveProperty("bookingid")
    expect(responseBody).toHaveProperty("booking")
    expect(responseBody).toHaveProperty("booking.additionalneeds")

    //validate booking details
    const booking=responseBody.booking;


    expect(booking).toMatchObject({
        firstname: requestBody.firstname,
        lastname: requestBody.lastname,
        totalprice: requestBody.totalprice,
        depositpaid: requestBody.depositpaid,
        additionalneeds: requestBody.additionalneeds
    });

    //validate booking dates (nested json object)
    expect(booking.bookingdates).toMatchObject({
            checkin:requestBody.bookingdates.checkin,
            checkout: requestBody.bookingdates.checkout
        });



})