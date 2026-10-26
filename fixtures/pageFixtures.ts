import { test as base } from "@playwright/test";
import dotenv from "dotenv";
import { AccountSuccessPage } from "../pages/AccountSuccessPage";
import { AdminCustomersPage } from "../pages/AdminCustomersPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { MyAccountPage } from "../pages/MyAccountPage";
import { LogoutPage } from "../pages/LogoutPage";
import { CartPage } from "../pages/CartPage";
import { ProductPage } from "../pages/ProductPage";
import { ProductSearchPage } from "../pages/ProductSearchPage";
import { RegisterPage } from "../pages/RegisterPage";

dotenv.config();

const APP_URL = process.env.WEB_APP_URL;

if (!APP_URL) {
  throw new Error("WEB_APP_URL must be set in the environment to run web tests.");
}

type PageFixtures = {
  homePage: HomePage;
  registerPage: RegisterPage;
  accountSuccessPage: AccountSuccessPage;
  myAccountPage: MyAccountPage;
  loginPage: LoginPage;
  logoutPage: LogoutPage;
  productSearchPage: ProductSearchPage;
  productPage: ProductPage;
  cartPage: CartPage;
  adminCustomersPage: AdminCustomersPage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await page.goto(APP_URL);
    await use(new HomePage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  accountSuccessPage: async ({ page }, use) => {
    await use(new AccountSuccessPage(page));
  },
  myAccountPage: async ({ page }, use) => {
    await use(new MyAccountPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  logoutPage: async ({ page }, use) => {
    await use(new LogoutPage(page));
  },
  productSearchPage: async ({ page }, use) => {
    await use(new ProductSearchPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  adminCustomersPage: async ({ page }, use) => {
    await use(new AdminCustomersPage(page));
  },
});

test.afterEach(async ({ page, context }) => {
  if (!page.isClosed()) {
    await page.close();
  }
  await context.close();
});

export { expect } from "@playwright/test";
