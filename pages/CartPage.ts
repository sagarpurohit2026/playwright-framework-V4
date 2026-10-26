import { Locator, Page } from "@playwright/test";

export class CartPage {
  private readonly page: Page;

  // Locators
  private readonly lnkShoppingCart: Locator;
  private readonly headingShoppingCart: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.lnkShoppingCart = page.locator('#top-links a[href*="route=checkout/cart"]').first();
    this.headingShoppingCart = page.locator("#content h1");
  }

  /**
   * Opens the shopping cart.
   */
  async openCart(): Promise<void> {
    await this.lnkShoppingCart.click();
    await this.page.waitForURL(
      (url) => url.searchParams.get("route") === "checkout/cart",
      { waitUntil: "domcontentloaded" },
    );
    await this.headingShoppingCart.waitFor({ state: "visible" });
  }

  /**
   * Verifies that the shopping cart page is displayed.
   * @returns Promise<boolean> - true when the cart heading is visible
   */
  async isCartPageDisplayed(): Promise<boolean> {
    await this.headingShoppingCart.waitFor({ state: "visible" });
    return (await this.headingShoppingCart.innerText()).startsWith("Shopping Cart");
  }

  /**
   * Reads the requested product quantity in the cart.
   * @param productName - Product name to inspect
   * @returns Promise<string> - Quantity entered in the cart
   */
  async getProductQuantity(productName: string): Promise<string> {
    return this.productRow(productName).locator('input[name^="quantity"]').inputValue();
  }

  /**
   * Reads the unit price and line total for a cart product.
   * @param productName - Product name to inspect
   * @returns Promise<{ unitPrice: string; lineTotal: string }> - Displayed row prices
   */
  async getProductPrices(productName: string): Promise<{ unitPrice: string; lineTotal: string }> {
    const cells = this.productRow(productName).locator("td");
    return {
      unitPrice: (await cells.nth(4).innerText()).trim(),
      lineTotal: (await cells.nth(5).innerText()).trim(),
    };
  }

  /**
   * Reads the grand total displayed in the cart.
   * @returns Promise<string> - Displayed cart total
   */
  async getCartTotal(): Promise<string> {
    const totalRow = this.page
      .locator("#content table")
      .last()
      .locator("tr")
      .last();
    return (await totalRow.locator("td").last().innerText()).trim();
  }

  private productRow(productName: string): Locator {
    return this.page
      .locator("#content table")
      .first()
      .locator("tbody tr")
      .filter({ hasText: productName });
  }
}
