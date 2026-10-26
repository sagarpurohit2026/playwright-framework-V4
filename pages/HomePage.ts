import { Locator, Page } from "@playwright/test";

export class HomePage {
  private readonly page: Page;

  // Locators
  private readonly lnkMyAccount: Locator;
  private readonly lnkRegister: Locator;
  private readonly lnkLogin: Locator;
  private readonly txtSearch: Locator;
  private readonly btnSearch: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.lnkMyAccount = page.locator('a[href*="route=account/account"]').first();
    this.lnkRegister = page.getByRole("link", { name: "Register", exact: true }).first();
    this.lnkLogin = page.getByRole("link", { name: "Login", exact: true }).first();
    this.txtSearch = page.getByPlaceholder("Search");
    this.btnSearch = page.locator("#search button");
  }

  /**
   * Opens the My Account navigation menu.
   */
  async clickMyAccount(): Promise<void> {
    await this.lnkMyAccount.click();
  }

  /**
   * Opens the customer registration page.
   */
  async clickRegister(): Promise<void> {
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get("route") === "account/register"),
      this.lnkRegister.click(),
    ]);
  }

  /**
   * Opens the customer login page.
   */
  async clickLogin(): Promise<void> {
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get("route") === "account/login"),
      this.lnkLogin.click(),
    ]);
  }

  /**
   * Searches the storefront for a product.
   * @param productName - Product name to search for
   */
  async searchProduct(productName: string): Promise<void> {
    await this.txtSearch.fill(productName);
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get("route") === "product/search"),
      this.btnSearch.click(),
    ]);
  }

  /**
   * Checks whether authenticated logout navigation is visible.
   * @returns Promise<boolean> - true when a logout option is visible
   */
  async isLogoutOptionVisible(): Promise<boolean> {
    return this.page.locator('#top-links a[href*="route=account/logout"]:visible').count().then((count) => count > 0);
  }
}
