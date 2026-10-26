/**
 * Test Case: Successful customer registration
 *
 * Tags: @master @sanity @regression @web
 *
 * Steps:
 * 1) Navigate to My Account → Register
 * 2) Verify the registration page
 * 3) Complete and submit the registration form
 * 4) Verify the account-created confirmation
 * 5) Verify the new account navigation
 */
import { test, expect } from "../../fixtures/pageFixtures";
import { RandomDataUtil } from "../../utils/dataGenerator";

test("Customer registration flow @master @sanity @regression @web", async ({
  homePage,
  registerPage,
  accountSuccessPage,
  myAccountPage,
}) => {
  const registrationDetails = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getUniqueEmail(),
    telephone: RandomDataUtil.getPhoneNumber(),
    password: RandomDataUtil.getPassword(12),
  };

  await test.step("1) Navigate to My Account → Register", async () => {
    await homePage.clickMyAccount();
    await homePage.clickRegister();
  });

  await test.step("2) Verify the registration page is displayed", async () => {
    expect(await registerPage.isRegisterPageExists()).toBeTruthy();
  });

  await test.step("3) Complete and submit the registration form", async () => {
    await registerPage.completeRegistration(registrationDetails);
  });

  await test.step("4) Verify the account-created confirmation", async () => {
    expect(await accountSuccessPage.isAccountCreatedMessageVisible()).toBeTruthy();
  });

  await test.step("5) Verify the new account is available through account navigation", async () => {
    await accountSuccessPage.clickContinue();
    expect(await myAccountPage.isMyAccountPageExists()).toBeTruthy();
  });

  console.log("✅ Customer registration completed successfully!");
});
