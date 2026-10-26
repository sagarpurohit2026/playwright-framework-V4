import { Locator, Page } from "@playwright/test";

export class AdminCustomersPage {
  private readonly page: Page;
  private adminUrl?: URL;
  private userToken?: string;

  constructor(page: Page) {
    this.page = page;
  }

  async login(adminUrl: string, username: string, password: string): Promise<void> {
    this.adminUrl = new URL(adminUrl);
    await this.page.goto(adminUrl);
    await this.page.locator("#input-username").fill(username);
    await this.page.locator("#input-password").fill(password);
    await Promise.all([
      this.page.waitForURL((url) => url.searchParams.has("user_token")),
      this.page.locator('button[type="submit"]').click(),
    ]);

    this.userToken = new URL(this.page.url()).searchParams.get("user_token") ?? undefined;
  }

  async openCustomers(): Promise<void> {
    if (!this.adminUrl || !this.userToken) {
      throw new Error("Log in to the admin portal before opening the customer list.");
    }

    const customersUrl = new URL(this.adminUrl);
    customersUrl.searchParams.set("route", "customer/customer");
    customersUrl.searchParams.set("user_token", this.userToken);
    await this.page.goto(customersUrl.toString());
    await this.page.locator("#form-customer").waitFor({ state: "visible" });
  }

  async searchCustomerByEmail(email: string): Promise<void> {
    await this.page.locator("#input-email").fill(email);
    await this.page.locator("#button-filter").click();
  }

  customerRow(email: string): Locator {
    return this.page
      .locator("#form-customer tbody tr")
      .filter({ hasText: email });
  }

  async openCustomerDetails(email: string): Promise<void> {
    await this.customerRow(email)
      .locator('a[href*="route=customer/customer/edit"]')
      .click();
  }

  get firstNameField(): Locator {
    return this.page.locator("#input-firstname");
  }

  get lastNameField(): Locator {
    return this.page.locator("#input-lastname");
  }

  get emailField(): Locator {
    return this.page.locator("#input-email");
  }

  get statusField(): Locator {
    return this.page.locator("#input-status");
  }
}
