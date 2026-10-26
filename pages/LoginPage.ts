import { Locator, Page } from "@playwright/test";

export class LoginPage {
  // Locators
  private readonly headingReturningCustomer: Locator;
  private readonly txtEmail: Locator;
  private readonly txtPassword: Locator;
  private readonly btnLogin: Locator;
  private readonly warningContainer: Locator;

  constructor(page: Page) {
    // Initialize locators with CSS selectors
    this.headingReturningCustomer = page
      .locator("#content")
      .getByRole("heading", { name: "Returning Customer", exact: true });
    this.txtEmail = page.getByPlaceholder("E-Mail Address");
    this.txtPassword = page.getByPlaceholder("Password", { exact: true });
    this.btnLogin = page.getByRole("button", { name: "Login", exact: true });
    this.warningContainer = page.locator(".alert-danger");
  }

  /**
   * Verifies that the customer login page is displayed.
   * @returns Promise<boolean> - true when the returning-customer form is visible
   */
  async isLoginPageExists(): Promise<boolean> {
    await this.headingReturningCustomer.waitFor({ state: "visible" });
    return this.headingReturningCustomer.isVisible();
  }

  /**
   * Enters credentials and submits the login form.
   * @param email - Customer email address
   * @param password - Customer password
   */
  async login(email: string, password: string): Promise<void> {
    await this.txtEmail.fill(email.trim() ? email : "");
    await this.txtPassword.fill(password.trim() ? password : "");
    await this.btnLogin.click();
  }

  /**
   * Verifies that the invalid-credentials warning is displayed.
   * @returns Promise<boolean> - true when the warning is visible
   */
  async isInvalidLoginWarningVisible(): Promise<boolean> {
    await this.warningContainer.waitFor({ state: "visible" });
    const warningText = await this.warningContainer.innerText();
    return (
      warningText.includes("Warning: No match for E-Mail Address and/or Password.") ||
      warningText.includes("Warning: Your account has exceeded allowed number of login attempts.")
    );
  }
}
