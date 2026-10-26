import { Locator, Page } from "@playwright/test";

export type RegistrationDetails = {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
};

export class RegisterPage {
  // Locators
  private readonly headingRegisterAccount: Locator;
  private readonly txtFirstName: Locator;
  private readonly txtLastName: Locator;
  private readonly txtEmail: Locator;
  private readonly txtTelephone: Locator;
  private readonly txtPassword: Locator;
  private readonly txtPasswordConfirm: Locator;
  private readonly chkPrivacyPolicy: Locator;
  private readonly btnContinue: Locator;

  constructor(page: Page) {
    // Initialize locators with CSS selectors
    this.headingRegisterAccount = page.getByRole("heading", { name: "Register Account" });
    this.txtFirstName = page.getByPlaceholder("First Name");
    this.txtLastName = page.getByPlaceholder("Last Name");
    this.txtEmail = page.getByPlaceholder("E-Mail");
    this.txtTelephone = page.getByPlaceholder("Telephone");
    this.txtPassword = page.getByPlaceholder("Password", { exact: true });
    this.txtPasswordConfirm = page.getByPlaceholder("Password Confirm");
    this.chkPrivacyPolicy = page.getByRole("checkbox");
    this.btnContinue = page.getByRole("button", { name: "Continue", exact: true });
  }

  /**
   * Verifies that the customer registration page is displayed.
   * @returns Promise<boolean> - true when the registration heading is visible
   */
  async isRegisterPageExists(): Promise<boolean> {
    await this.headingRegisterAccount.waitFor({ state: "visible" });
    return this.headingRegisterAccount.isVisible();
  }

  /**
   * Completes and submits the customer registration form.
   * @param details - Customer details for the registration
   */
  async completeRegistration(details: RegistrationDetails): Promise<void> {
    try {
      await this.txtFirstName.fill(details.firstName);
      await this.txtLastName.fill(details.lastName);
      await this.txtEmail.fill(details.email);
      await this.txtTelephone.fill(details.telephone);
      await this.txtPassword.fill(details.password);
      await this.txtPasswordConfirm.fill(details.password);
      await this.chkPrivacyPolicy.check();
      await this.btnContinue.click();
    } catch (error) {
      console.log(`Error completing customer registration: ${error}`);
      throw error;
    }
  }
}
