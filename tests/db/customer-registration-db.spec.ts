import { test, expect } from "../../fixtures/pageFixtures";
import dotenv from "dotenv";
import type { RowDataPacket } from "mysql2/promise";
import type { RegistrationDetails } from "../../pages/RegisterPage";
import { RandomDataUtil } from "../../utils/dataGenerator";
import { executeQuery } from "../../utils/dbClient";

dotenv.config();

interface CustomerRecord extends RowDataPacket {
  firstname: string;
  lastname: string;
  email: string;
  status: number;
  date_added?: string | Date | null;
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in the environment to run customer registration tests.`);
  }
  return value;
}

test("Register customer and verify Admin and MySQL records @master @regression @db @end-to-end", async ({
  page,
  homePage,
  registerPage,
  accountSuccessPage,
  adminCustomersPage,
}) => {
  const appUrl = requiredEnvironmentValue("WEB_APP_URL");
  const appBaseUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;
  const adminUrl = new URL("admin/index.php", appBaseUrl).toString();
  const adminUsername = requiredEnvironmentValue("ADMIN_USERNAME");
  const adminPassword = requiredEnvironmentValue("ADMIN_PASSWORD");
  const registrationDetails: RegistrationDetails = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getUniqueEmail(),
    telephone: RandomDataUtil.getPhoneNumber(),
    password: RandomDataUtil.getPassword(12),
  };

  let testFailed = false;

  try {
    await test.step("Register a unique customer through the storefront", async () => {
      await homePage.clickMyAccount();
      await homePage.clickRegister();
      expect(await registerPage.isRegisterPageExists()).toBeTruthy();

      await registerPage.completeRegistration(registrationDetails);
      expect(await accountSuccessPage.isAccountCreatedMessageVisible()).toBeTruthy();
    });

    await test.step("Find and verify the customer in the admin portal", async () => {
      await adminCustomersPage.login(adminUrl, adminUsername, adminPassword);
      await expect(page.locator("#menu-customer"), "Admin login should open the customer menu.")
        .toBeVisible();

      await adminCustomersPage.openCustomers();
      await adminCustomersPage.searchCustomerByEmail(registrationDetails.email);

      const customerRow = adminCustomersPage.customerRow(registrationDetails.email);
      await expect(customerRow, "The registered customer should appear in the admin list.")
        .toHaveCount(1);
      await expect(customerRow).toContainText(
        `${registrationDetails.firstName} ${registrationDetails.lastName}`,
      );
      await expect(customerRow).toContainText(registrationDetails.email);
      await expect(customerRow, "A newly registered customer should be enabled.")
        .toContainText("Enabled");

      await adminCustomersPage.openCustomerDetails(registrationDetails.email);
      await expect(adminCustomersPage.firstNameField).toHaveValue(registrationDetails.firstName);
      await expect(adminCustomersPage.lastNameField).toHaveValue(registrationDetails.lastName);
      await expect(adminCustomersPage.emailField).toHaveValue(registrationDetails.email);
      await expect(adminCustomersPage.statusField).toHaveValue("1");
    });

    await test.step("Verify the same customer in the MySQL database", async () => {
      const [dateAddedColumns] = await executeQuery(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'oc_customer'
           AND COLUMN_NAME = 'date_added'`,
      );
      const hasDateAddedColumn =
        Array.isArray(dateAddedColumns) && dateAddedColumns.length > 0;
      const dateAddedField = hasDateAddedColumn ? ", date_added" : "";
      const [customerRows] = await executeQuery(
        `SELECT firstname, lastname, email, status${dateAddedField}
         FROM oc_customer
         WHERE email = ?`,
        [registrationDetails.email],
      );

      expect(Array.isArray(customerRows), "The customer query should return rows.").toBeTruthy();
      if (!Array.isArray(customerRows)) {
        throw new Error("The customer query did not return a row array.");
      }
      expect(customerRows.length, "Exactly one matching customer should exist in MySQL.").toBe(1);

      const customer = (customerRows as CustomerRecord[])[0];
      expect(customer.firstname, "The database first name should match registration data.").toBe(
        registrationDetails.firstName,
      );
      expect(customer.lastname, "The database last name should match registration data.").toBe(
        registrationDetails.lastName,
      );
      expect(customer.email, "The database email should match registration data.").toBe(
        registrationDetails.email,
      );
      expect(customer.status, "The database status should match the enabled admin status.").toBe(1);
      if (hasDateAddedColumn) {
        expect(customer.date_added, "The database date_added value should be present.").toBeTruthy();
      }
    });
  } catch (error) {
    testFailed = true;
    throw error;
  } finally {
    try {
      await executeQuery("DELETE FROM oc_customer WHERE email = ?", [registrationDetails.email]);
    } catch (cleanupError) {
      if (testFailed) {
        console.error("Customer cleanup failed after the test had already failed.", cleanupError);
      } else {
        throw cleanupError;
      }
    }
  }
});
