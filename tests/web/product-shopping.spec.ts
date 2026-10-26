/**
 * Test Cases: Product search, cart addition, and end-to-end shopping
 *
 * Tags: @master @sanity @regression @web @end-to-end
 */
import { test, expect } from "../../fixtures/pageFixtures";
import { RandomDataUtil } from "../../utils/dataGenerator";
import { Helper } from "../../utils/helper";

test("Product search flow @master @sanity @regression @web", async ({
  homePage,
  productSearchPage,
}) => {
  const { productName } = Helper.getProductDetails();

  await test.step("1) Search for a known product", async () => {
    await homePage.searchProduct(productName);
  });

  await test.step("2) Verify the results page and matching product", async () => {
    expect(await productSearchPage.isSearchResultsPageDisplayed(productName)).toBeTruthy();
    expect(await productSearchPage.isProductListed(productName)).toBeTruthy();
  });

  console.log("✅ Product search returned the expected product!");
});

test("Add product to cart flow @master @sanity @regression @web", async ({
  homePage,
  productSearchPage,
  productPage,
  cartPage,
}) => {
  test.setTimeout(60_000);
  const { productName, productQuantity, totalPrice } = Helper.getProductDetails();

  await test.step("1) Search for and open the configured product", async () => {
    await homePage.searchProduct(productName);
    const resultsDisplayed = await productSearchPage.isSearchResultsPageDisplayed(productName);
    expect(resultsDisplayed).toBeTruthy();
    expect(await productSearchPage.isProductListed(productName)).toBeTruthy();
    await productSearchPage.openProduct(productName);
    expect(await productPage.isProductDetailsDisplayed(productName)).toBeTruthy();
  });

  await test.step("2) Set the quantity and add the product to the cart", async () => {
    await productPage.setQuantity(productQuantity);
    await productPage.addToCart();
    expect(await productPage.getAddToCartMessage()).toContain(
      `Success: You have added ${productName} to your shopping cart!`,
    );
  });

  await test.step("3) Verify the selected product and quantity in the cart", async () => {
    await cartPage.openCart();
    expect(await cartPage.isCartPageDisplayed()).toBeTruthy();
    expect(await cartPage.getProductQuantity(productName)).toBe(productQuantity);
    expect(await cartPage.getCartTotal()).toBe(totalPrice);
  });

  console.log("✅ Product was added to the cart with the expected quantity!");
});

test("End-to-end customer shopping flow @master @regression @web @end-to-end", async ({
  homePage,
  registerPage,
  accountSuccessPage,
  loginPage,
  myAccountPage,
  productSearchPage,
  productPage,
  cartPage,
}) => {
  test.setTimeout(90_000);
  const customer = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getUniqueEmail(),
    telephone: RandomDataUtil.getPhoneNumber(),
    password: RandomDataUtil.getPassword(12),
  };
  const { productName, productQuantity, totalPrice } = Helper.getProductDetails();

  await test.step("1) Register a new customer", async () => {
    await homePage.clickMyAccount();
    await homePage.clickRegister();
    expect(await registerPage.isRegisterPageExists()).toBeTruthy();
    await registerPage.completeRegistration(customer);
    expect(await accountSuccessPage.isAccountCreatedMessageVisible()).toBeTruthy();
  });

  await test.step("2) Log out and log back in with the new customer credentials", async () => {
    const accountPage = await accountSuccessPage.clickContinue();
    expect(await accountPage.isMyAccountPageExists()).toBeTruthy();
    const logoutConfirmationPage = await myAccountPage.clickLogout();
    expect(await logoutConfirmationPage.isLogoutConfirmationDisplayed()).toBeTruthy();
    await logoutConfirmationPage.clickContinue();
    expect(await homePage.isLogoutOptionVisible()).toBeFalsy();
    await homePage.clickMyAccount();
    await homePage.clickLogin();
    await loginPage.login(customer.email, customer.password);
    expect(await myAccountPage.isMyAccountPageExists()).toBeTruthy();
  });

  await test.step("3) Search for the product and add it to the cart", async () => {
    await homePage.searchProduct(productName);
    expect(await productSearchPage.isProductListed(productName)).toBeTruthy();
    await productSearchPage.openProduct(productName);
    expect(await productPage.isProductDetailsDisplayed(productName)).toBeTruthy();
    expect(await productPage.getProductPrice()).toBe(totalPrice);
    await productPage.setQuantity(productQuantity);
    await productPage.addToCart();
    expect(await productPage.getAddToCartMessage()).toContain(
      `Success: You have added ${productName} to your shopping cart!`,
    );
  });

  await test.step("4) Verify product, quantity, price, and cart total", async () => {
    await cartPage.openCart();
    expect(await cartPage.isCartPageDisplayed()).toBeTruthy();
    expect(await cartPage.getProductQuantity(productName)).toBe(productQuantity);
    const prices = await cartPage.getProductPrices(productName);
    expect(prices.unitPrice).toBe(totalPrice);
    expect(prices.lineTotal).toBe(totalPrice);
    expect(await cartPage.getCartTotal()).toBe(totalPrice);
  });

  console.log("✅ End-to-end shopping journey completed successfully!");
});
