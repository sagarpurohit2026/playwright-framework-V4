/**
 * Test Cases: Customer login and logout
 *
 * Tags: @master @sanity @regression @web
 *
 * Scenarios:
 * 1) Successful login with configured customer credentials
 * 2) Rejected login with invalid credentials
 * 3) Successful customer logout
 */
import { test, expect } from "../../fixtures/pageFixtures";
import { RandomDataUtil } from "../../utils/dataGenerator";
import { Helper } from "../../utils/helper";

test("Customer valid login flow @master @sanity @regression @web", async ({
  homePage,
  loginPage,
  myAccountPage,
}) => {
  const { email, password } = Helper.getLoginDetails();

  await test.step("1) Navigate to My Account → Login", async () => {
    await homePage.clickMyAccount();
    await homePage.clickLogin();
  });

  await test.step("2) Verify and submit the login form", async () => {
    expect(await loginPage.isLoginPageExists()).toBeTruthy();
    await loginPage.login(email, password);
  });

  await test.step("3) Verify authentication and the My Account dashboard", async () => {
    expect(await myAccountPage.isMyAccountPageExists()).toBeTruthy();
  });

  console.log("✅ Customer login completed successfully!");
});

test("Customer invalid login flow @master @regression @web", async ({
  homePage,
  loginPage,
}) => {
  const invalidCredentials = {
    email: RandomDataUtil.getUniqueEmail(),
    password: RandomDataUtil.getPassword(),
  };

  await test.step("1) Navigate to My Account → Login", async () => {
    await homePage.clickMyAccount();
    await homePage.clickLogin();
    expect(await loginPage.isLoginPageExists()).toBeTruthy();
  });

  await test.step("2) Submit invalid credentials", async () => {
    await loginPage.login(invalidCredentials.email, invalidCredentials.password);
  });

  await test.step("3) Verify the login is rejected with the expected warning", async () => {
    expect(await loginPage.isInvalidLoginWarningVisible()).toBeTruthy();
    expect(await loginPage.isLoginPageExists()).toBeTruthy();
  });

  console.log("✅ Invalid customer login was rejected as expected!");
});

test("Customer logout flow @master @sanity @regression @web", async ({
  homePage,
  loginPage,
  myAccountPage,
  logoutPage,
}) => {
  const { email, password } = Helper.getLoginDetails();

  await test.step("1) Log in using configured customer credentials", async () => {
    await homePage.clickMyAccount();
    await homePage.clickLogin();
    await loginPage.login(email, password);
    expect(await myAccountPage.isMyAccountPageExists()).toBeTruthy();
  });

  await test.step("2) Log out and verify the confirmation page", async () => {
    await myAccountPage.clickLogout();
    expect(await logoutPage.isLogoutConfirmationDisplayed()).toBeTruthy();
  });

  await test.step("3) Continue to the homepage and verify account access is unauthenticated", async () => {
    await logoutPage.clickContinue();
    expect(await homePage.isLogoutOptionVisible()).toBeFalsy();
  });

  console.log("✅ Customer logout completed successfully!");
});
