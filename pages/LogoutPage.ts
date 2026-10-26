import { Locator, Page } from "@playwright/test";
import { HomePage } from "./HomePage";

export class LogoutPage {
  private readonly page: Page;

  // Locators
  private readonly headingAccountLogout: Locator;
  private readonly lnkContinue: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.headingAccountLogout = page.locator("#content h1");
    this.lnkContinue = page.getByRole("link", { name: "Continue", exact: true });
  }

  /**
   * Verifies that the logout confirmation page is displayed.
   * @returns Promise<boolean> - true when the account logout heading is shown
   */
  async isLogoutConfirmationDisplayed(): Promise<boolean> {
    await this.headingAccountLogout.waitFor({ state: "visible" });
    return (await this.headingAccountLogout.innerText()) === "Account Logout";
  }

  /**
   * Continues from the logout confirmation to the storefront home page.
   * @returns Promise<HomePage> - Home page object after navigation
   */
  async clickContinue(): Promise<HomePage> {
    await Promise.all([
      this.page.waitForURL(
        (url) => url.searchParams.get("route") === "common/home" || url.pathname.endsWith("/upload/"),
      ),
      this.lnkContinue.click(),
    ]);
    return new HomePage(this.page);
  }
}
