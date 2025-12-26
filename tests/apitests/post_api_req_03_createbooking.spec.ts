/*
Test: create booking
Request type: Post
Request body: random /dynamic data(faker)

Pre-requistes: 
----------------
Install faker-js library for generating dynamic data
  npm install @faker-js/faker

Install Luxon is a library for working with dates and times in JavaScript.
  npm install luxon


Add url to playwright.config.ts file
	baseURL: 'https://restful-booker.herokuapp.com'
 
*/

import { test, expect } from "@playwright/test"
import {faker} from "@faker-js/faker";
import {DateTime} from "luxon";

test("Create Post request using static body", async({ request }) => {

    // Request body using the Faker library and Luxon for dynamic data
    const firstname = faker.person.firstName();
    const lastname = faker.person.lastName();
    const totalprice = faker.number.int({ min: 100, max: 1000 });
    const depositpaid = faker.datatype.boolean();
    const checkin = DateTime.now().plus({ days: 1 }).toFormat('yyyy-MM-dd');
    const checkout = DateTime.now().plus({ days: 5 }).toFormat('yyyy-MM-dd');
    const additionalneeds = faker.lorem.words(3);

     //request body
    const requestBody = {
        firstname: firstname,
        lastname: lastname,
        totalprice: totalprice,
        depositpaid: depositpaid,
        bookingdates: {
            checkin: checkin,
            checkout: checkout,
        },
        additionalneeds: additionalneeds,
    }
   
    // send post request

    const response=await request.post("/booking",{data:requestBody});

    const responseBody=await response.json();  // Extractred response
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
        additionalneeds: requestBody.additionalneeds,
    });

    //validate booking dates (nested json object)
    expect(booking.bookingdates).toMatchObject({
            checkin:requestBody.bookingdates.checkin,
            checkout: requestBody.bookingdates.checkout
        });



})