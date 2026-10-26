import { Locator, Page } from "@playwright/test";
import { LogoutPage } from "./LogoutPage";

export class MyAccountPage {
  private readonly page: Page;

  // Locators
  private readonly headingMyAccount: Locator;
  private readonly lnkEditAccount: Locator;
  private readonly lnkTopMyAccount: Locator;
  private readonly lnkLogout: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    const accountContent = page.locator("#content");
    this.headingMyAccount = accountContent.getByRole("heading", {
      name: "My Account",
      exact: true,
    });
    this.lnkEditAccount = accountContent.getByRole("link", {
      name: "Edit your account information",
      exact: true,
    });
    this.lnkTopMyAccount = page.locator('#top-links a[href*="route=account/account"]').first();
    this.lnkLogout = page.locator('#top-links a[href*="route=account/logout"]:visible');
  }

  /**
   * Verifies that the customer account page and its account navigation are displayed.
   * @returns Promise<boolean> - true when the account heading and Edit Account link are visible
   */
  async isMyAccountPageExists(): Promise<boolean> {
    try {
      await this.headingMyAccount.waitFor({ state: "visible" });
      await this.lnkEditAccount.waitFor({ state: "visible" });
      return true;
    } catch (error) {
      console.log(`Error checking customer account page: ${error}`);
      return false;
    }
  }

  /**
   * Opens the account menu and logs the customer out.
   * @returns Promise<LogoutPage> - Logout confirmation page object
   */
  async clickLogout(): Promise<LogoutPage> {
    await this.lnkTopMyAccount.click();
    await this.lnkLogout.waitFor({ state: "visible" });
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get("route") === "account/logout"),
      this.lnkLogout.click(),
    ]);
    return new LogoutPage(this.page);
  }
}
