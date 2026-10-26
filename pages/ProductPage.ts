import { Locator, Page } from "@playwright/test";

export class ProductPage {
  // Locators
  private readonly headingProduct: Locator;
  private readonly productPrice: Locator;
  private readonly txtQuantity: Locator;
  private readonly btnAddToCart: Locator;
  private readonly successMessage: Locator;

  constructor(page: Page) {
    // Initialize locators with CSS selectors
    this.headingProduct = page.locator("#content h1");
    this.productPrice = page.locator("#content h2").filter({ hasText: /^\$/ });
    this.txtQuantity = page.locator("#input-quantity");
    this.btnAddToCart = page.getByRole("button", { name: "Add to Cart", exact: true });
    this.successMessage = page.locator(".alert-success");
  }

  /**
   * Verifies that the requested product details are displayed.
   * @param productName - Expected product name
   * @returns Promise<boolean> - true when the product heading matches
   */
  async isProductDetailsDisplayed(productName: string): Promise<boolean> {
    await this.headingProduct.waitFor({ state: "visible" });
    return (await this.headingProduct.innerText()) === productName;
  }

  /**
   * Sets the product quantity.
   * @param quantity - Quantity to add to the cart
   */
  async setQuantity(quantity: string): Promise<void> {
    await this.txtQuantity.fill(quantity);
  }

  /**
   * Adds the displayed product to the shopping cart.
   */
  async addToCart(): Promise<void> {
    await this.btnAddToCart.click();
  }

  /**
   * Reads the product price displayed on the details page.
   * @returns Promise<string> - Displayed product price
   */
  async getProductPrice(): Promise<string> {
    return (await this.productPrice.innerText()).trim();
  }

  /**
   * Reads the add-to-cart confirmation message.
   * @returns Promise<string> - Confirmation text
   */
  async getAddToCartMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: "visible" });
    return (await this.successMessage.innerText()).trim();
  }
}
