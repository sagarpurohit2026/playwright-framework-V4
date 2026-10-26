import { Locator, Page } from "@playwright/test";
import { MyAccountPage } from "./MyAccountPage";

export class AccountSuccessPage {
  private readonly page: Page;

  // Locators
  private readonly headingAccountCreated: Locator;
  private readonly btnContinue: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.headingAccountCreated = page.getByRole("heading", {
      name: "Your Account Has Been Created!",
    });
    this.btnContinue = page.getByRole("link", { name: "Continue", exact: true });
  }

  /**
   * Verifies that the account-created confirmation is displayed.
   * @returns Promise<boolean> - true when the confirmation heading is visible
   */
  async isAccountCreatedMessageVisible(): Promise<boolean> {
    await this.headingAccountCreated.waitFor({ state: "visible" });
    return this.headingAccountCreated.isVisible();
  }

  /**
   * Continues to the newly created customer's account page.
   * @returns Promise<MyAccountPage> - account page object after navigation
   */
  async clickContinue(): Promise<MyAccountPage> {
    await this.btnContinue.click();
    return new MyAccountPage(this.page);
  }
}
