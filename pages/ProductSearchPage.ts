import { Locator, Page } from "@playwright/test";
import { ProductPage } from "./ProductPage";

export class ProductSearchPage {
  private readonly page: Page;

  // Locators
  private readonly headingSearchResults: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators with CSS selectors
    this.headingSearchResults = page.locator("#content h1");
  }

  /**
   * Verifies that the search results heading reflects the requested product.
   * @param productName - Searched product name
   * @returns Promise<boolean> - true when the expected results heading is shown
   */
  async isSearchResultsPageDisplayed(productName: string): Promise<boolean> {
    await this.headingSearchResults.waitFor({ state: "visible" });
    return (await this.headingSearchResults.innerText()) === `Search - ${productName}`;
  }

  /**
   * Verifies that a product is listed in the search results.
   * @param productName - Product name to find
   * @returns Promise<boolean> - true when the exact product link is visible
   */
  async isProductListed(productName: string): Promise<boolean> {
    return this.productLink(productName).isVisible();
  }

  /**
   * Opens the matching product details page.
   * @param productName - Product name to open
   * @returns Promise<ProductPage> - Product details page object
   */
  async openProduct(productName: string): Promise<ProductPage> {
    const productLink = this.productLink(productName);
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.get("route") === "product/product"),
      productLink.click(),
    ]);
    return new ProductPage(this.page);
  }

  private productLink(productName: string): Locator {
    return this.page
      .locator("#content")
      .getByRole("link", { name: productName, exact: true })
      .first();
  }
}
