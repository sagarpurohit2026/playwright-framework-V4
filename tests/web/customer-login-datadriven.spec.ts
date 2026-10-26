/**
 * Test Case: Customer login using external JSON test data
 *
 * Tags: @master @regression @web @datadriven
 */
import { test, expect } from "../../fixtures/pageFixtures";
import { DataProvider } from "../../utils/DataReader";
import { resolve } from "node:path";

type LoginTestData = {
  testName?: string;
  TestName?: string;
  email: string;
  password: string;
  expected: "success" | "failure";
};

const loginData = DataProvider.readJson(
  resolve(process.cwd(), "testdata", "opencart_logindata.json"),
) as LoginTestData[];

for (const [index, data] of loginData.entries()) {
  const scenarioName = data.testName ?? data.TestName ?? `Login data row ${index + 1}`;

  test(`${scenarioName} (row ${index + 1}) @master @regression @web @datadriven`, async ({
    homePage,
    loginPage,
    myAccountPage,
  }) => {
    await test.step("1) Open the login form", async () => {
      await homePage.clickMyAccount();
      await homePage.clickLogin();
      expect(await loginPage.isLoginPageExists()).toBeTruthy();
    });

    await test.step("2) Submit the row credentials without substituting blank values", async () => {
      await loginPage.login(data.email, data.password);
    });

    await test.step("3) Validate the result expected by this data row", async () => {
      if (data.expected === "success") {
        expect(await myAccountPage.isMyAccountPageExists()).toBeTruthy();
      } else {
        expect(await loginPage.isInvalidLoginWarningVisible()).toBeTruthy();
        expect(await loginPage.isLoginPageExists()).toBeTruthy();
      }
    });

    console.log(`✅ Data-driven login scenario "${scenarioName}" completed!`);
  });
}
