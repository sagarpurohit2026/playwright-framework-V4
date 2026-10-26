import { test, expect } from "@playwright/test";
import Ajv, { type ValidateFunction } from "ajv";
import dotenv from "dotenv";
import { Routes } from "../../api/endpoints/routes";
import { DataProvider } from "../../utils/DataReader";
import { RandomDataUtil } from "../../utils/dataGenerator";

const dotenvConfig = dotenv.config();

const ajv = new Ajv();
const validateProductSchema = ajv.compile(
  DataProvider.readJson("api/schemas/product_api_schema.json"),
);
const validateUserSchema = ajv.compile(
  DataProvider.readJson("api/schemas/user_api_schema.json"),
);
const validateCartSchema = ajv.compile(
  DataProvider.readJson("api/schemas/cart_api_schema.json"),
);

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in the environment to run FakeStore API tests.`);
  }
  return value;
}

function requiredEnvironmentNumber(name: string): number {
  const value = Number(requiredEnvironmentValue(name));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer to run FakeStore API tests.`);
  }
  return value;
}

function expectSchema(
  validator: ValidateFunction,
  value: unknown,
  description: string,
): void {
  const isValid = validator(value);
  expect(isValid, `${description}: ${ajv.errorsText(validator.errors)}`).toBeTruthy();
}

test.describe("FakeStore API Tests", () => {
  // ---------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------

  const BASE_URL = process.env.API_BASE_URL || Routes.BASE_URL;
  const LOGIN_USERNAME = dotenvConfig.parsed?.USERNAME ?? requiredEnvironmentValue("USERNAME");
  const LOGIN_PASSWORD = dotenvConfig.parsed?.PASSWORD ?? requiredEnvironmentValue("PASSWORD");
  const USER_ID = requiredEnvironmentNumber("USER_ID");
  const PRODUCT_ID = requiredEnvironmentNumber("PRODUCT_ID");
  const CART_ID = requiredEnvironmentNumber("CART_ID");
  const LIMIT = requiredEnvironmentNumber("LIMIT");
  const START_DATE = requiredEnvironmentValue("START_DATE");
  const END_DATE = requiredEnvironmentValue("END_DATE");

  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  test("POST - Successful Login @master @sanity @api", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${Routes.AUTH_LOGIN}`, {
      data: {
        username: LOGIN_USERNAME,
        password: LOGIN_PASSWORD,
      },
    });

    expect(response.status(), "Valid credentials should return HTTP 201.").toBe(201);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty("token");
    expect(typeof responseBody.token, "The authentication token should be a string.").toBe(
      "string",
    );
    expect(responseBody.token.length, "The authentication token should not be empty.").toBeGreaterThan(
      0,
    );
  });

  test("POST - Invalid Login @master @regression @api", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${Routes.AUTH_LOGIN}`, {
      data: RandomDataUtil.generateInvalidLoginPayload(),
    });

    expect(response.status(), "Invalid credentials should return HTTP 401.").toBe(401);

    const contentType = response.headers()["content-type"] ?? "";
    const responseBody = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const errorMessage =
      typeof responseBody === "string" ? responseBody : responseBody.message;
    expect(errorMessage, "The API should return the expected login error.").toBe(
      "username or password is incorrect",
    );
  });

  // ---------------------------------------------------------
  // Products - GET
  // ---------------------------------------------------------

  test("GET - All Products @master @sanity @api", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_PRODUCTS}`);

    expect(response.status(), "Retrieving products should return HTTP 200.").toBe(200);

    const products = await response.json();
    expect(Array.isArray(products), "The products response should be an array.").toBeTruthy();
    expect(products.length, "At least one product should be returned.").toBeGreaterThan(0);
    products.forEach((product: unknown) =>
      expectSchema(validateProductSchema, product, "Product response should match its schema"),
    );
  });

  test("GET - Product by ID @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_PRODUCT_BY_ID.replace("{id}", String(PRODUCT_ID));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving a product by ID should return HTTP 200.").toBe(200);

    const product = await response.json();
    expectSchema(validateProductSchema, product, "Product response should match its schema");
    expect(product.id, "The response ID should match the requested product ID.").toBe(PRODUCT_ID);
  });

  test("GET - Products with Limit @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_PRODUCTS_WITH_LIMIT.replace("{limit}", String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving limited products should return HTTP 200.").toBe(200);

    const products = await response.json();
    expect(Array.isArray(products), "The limited products response should be an array.").toBeTruthy();
    expect(products.length, "The API should return the requested number of products.").toBe(LIMIT);
    products.forEach((product: unknown) =>
      expectSchema(validateProductSchema, product, "Product response should match its schema"),
    );
  });

  test("GET - Products Sorted Ascending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_PRODUCTS_SORTED.replace("{order}", "asc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Ascending product sorting should return HTTP 200.").toBe(200);

    const products = await response.json();
    expect(Array.isArray(products), "The sorted products response should be an array.").toBeTruthy();
    const productIds = products.map((product: { id: number }) => product.id);
    expect(productIds, "Product IDs should be in ascending order.").toEqual(
      [...productIds].sort((firstId, secondId) => firstId - secondId),
    );
  });

  test("GET - Products Sorted Descending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_PRODUCTS_SORTED.replace("{order}", "desc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Descending product sorting should return HTTP 200.").toBe(200);

    const products = await response.json();
    expect(Array.isArray(products), "The sorted products response should be an array.").toBeTruthy();
    const productIds = products.map((product: { id: number }) => product.id);
    expect(productIds, "Product IDs should be in descending order.").toEqual(
      [...productIds].sort((firstId, secondId) => secondId - firstId),
    );
  });

  test("GET - All Product Categories @master @sanity @api", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_CATEGORIES}`);

    expect(response.status(), "Retrieving product categories should return HTTP 200.").toBe(200);

    const categories = await response.json();
    expect(Array.isArray(categories), "The categories response should be an array.").toBeTruthy();
    expect(categories.length, "At least one product category should be returned.").toBeGreaterThan(
      0,
    );
  });

  test("GET - Products by Category @master @sanity @api", async ({ request }) => {
    const category = "electronics";
    const route = Routes.GET_PRODUCTS_BY_CATEGORY.replace(
      "{category}",
      encodeURIComponent(category),
    );
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving products by category should return HTTP 200.").toBe(200);

    const products = await response.json();
    expect(Array.isArray(products), "The category products response should be an array.").toBeTruthy();
    products.forEach((product: { category: string }) => {
      expect(product.category, "Each returned product should belong to the requested category.").toBe(
        category,
      );
    });
  });

  // ---------------------------------------------------------
  // Products - POST / PUT / DELETE
  // ---------------------------------------------------------

  test("POST - Create Product @master @regression @api", async ({ request }) => {
    const payload = RandomDataUtil.generateProductPayload();
    const response = await request.post(`${BASE_URL}${Routes.CREATE_PRODUCT}`, {
      data: payload,
    });

    expect(response.status(), "Creating a product should return HTTP 201.").toBe(201);

    const createdProduct = await response.json();
    expect(Number.isInteger(createdProduct.id), "The created product should have an integer ID.").toBe(
      true,
    );
    expect(createdProduct).toMatchObject(payload);
  });

  test("PUT - Update Product @master @regression @api", async ({ request }) => {
    const payload = RandomDataUtil.generateUpdatedProductPayload();
    const route = Routes.UPDATE_PRODUCT.replace("{id}", String(PRODUCT_ID));
    const response = await request.put(`${BASE_URL}${route}`, { data: payload });

    expect(response.status(), "Updating a product should return HTTP 200.").toBe(200);

    const updatedProduct = await response.json();
    expect(updatedProduct.id, "The response ID should match the requested product ID.").toBe(
      PRODUCT_ID,
    );
    expect(updatedProduct).toMatchObject(payload);
  });

  test("DELETE - Product @master @regression @api", async ({ request }) => {
    const route = Routes.DELETE_PRODUCT.replace("{id}", String(PRODUCT_ID));
    const response = await request.delete(`${BASE_URL}${route}`);

    expect(response.status(), "Deleting a product should return HTTP 200.").toBe(200);

    const deletedProduct = await response.json();
    expect(deletedProduct.id, "The deletion response should identify the deleted product.").toBe(
      PRODUCT_ID,
    );
  });

  // ---------------------------------------------------------
  // Users - GET
  // ---------------------------------------------------------

  test("GET - All Users @master @sanity @api", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_USERS}`);

    expect(response.status(), "Retrieving users should return HTTP 200.").toBe(200);

    const users = await response.json();
    expect(Array.isArray(users), "The users response should be an array.").toBeTruthy();
    expect(users.length, "At least one user should be returned.").toBeGreaterThan(0);
    users.forEach((user: unknown) =>
      expectSchema(validateUserSchema, user, "User response should match its schema"),
    );
  });

  test("GET - User by ID @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_USER_BY_ID.replace("{id}", String(USER_ID));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving a user by ID should return HTTP 200.").toBe(200);

    const user = await response.json();
    expectSchema(validateUserSchema, user, "User response should match its schema");
    expect(user.id, "The response ID should match the requested user ID.").toBe(USER_ID);
  });

  test("GET - Users with Limit @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_USERS_WITH_LIMIT.replace("{limit}", String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving limited users should return HTTP 200.").toBe(200);

    const users = await response.json();
    expect(Array.isArray(users), "The limited users response should be an array.").toBeTruthy();
    expect(users.length, "The API should return the requested number of users.").toBe(LIMIT);
    users.forEach((user: unknown) =>
      expectSchema(validateUserSchema, user, "User response should match its schema"),
    );
  });

  test("GET - Users Sorted Ascending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_USERS_SORTED.replace("{order}", "asc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Ascending user sorting should return HTTP 200.").toBe(200);

    const users = await response.json();
    expect(Array.isArray(users), "The sorted users response should be an array.").toBeTruthy();
    const userIds = users.map((user: { id: number }) => user.id);
    expect(userIds, "User IDs should be in ascending order.").toEqual(
      [...userIds].sort((firstId, secondId) => firstId - secondId),
    );
  });

  test("GET - Users Sorted Descending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_USERS_SORTED.replace("{order}", "desc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Descending user sorting should return HTTP 200.").toBe(200);

    const users = await response.json();
    expect(Array.isArray(users), "The sorted users response should be an array.").toBeTruthy();
    const userIds = users.map((user: { id: number }) => user.id);
    expect(userIds, "User IDs should be in descending order.").toEqual(
      [...userIds].sort((firstId, secondId) => secondId - firstId),
    );
  });

  // ---------------------------------------------------------
  // Users - POST / PUT / DELETE
  // ---------------------------------------------------------

  test("POST - Create User @master @regression @api", async ({ request }) => {
    const payload = RandomDataUtil.generateUserPayload();
    const response = await request.post(`${BASE_URL}${Routes.CREATE_USER}`, {
      data: payload,
    });

    expect(response.status(), "Creating a user should return HTTP 201.").toBe(201);

    const createdUser = await response.json();
    expect(Number.isInteger(createdUser.id), "The created user should have an integer ID.").toBe(
      true,
    );
    expect(payload).toMatchObject({
      email: expect.any(String),
      username: expect.any(String),
      password: expect.any(String),
      name: {
        firstname: expect.any(String),
        lastname: expect.any(String),
      },
      address: {
        city: expect.any(String),
        street: expect.any(String),
        number: expect.any(Number),
        zipcode: expect.any(String),
        geolocation: {
          lat: expect.any(String),
          long: expect.any(String),
        },
      },
      phone: expect.any(String),
    });
  });

  test("PUT - Update User @master @regression @api", async ({ request }) => {
    const payload = RandomDataUtil.generateUserUpdatePayload();
    const route = Routes.UPDATE_USER.replace("{id}", String(USER_ID));
    const response = await request.put(`${BASE_URL}${route}`, { data: payload });

    expect(response.status(), "Updating a user should return HTTP 200.").toBe(200);

    const updatedUser = await response.json();
    expect(updatedUser).toMatchObject(payload);
  });

  test("DELETE - User @master @regression @api", async ({ request }) => {
    const route = Routes.DELETE_USER.replace("{id}", String(USER_ID));
    const response = await request.delete(`${BASE_URL}${route}`);

    expect(response.status(), "Deleting a user should return HTTP 200.").toBe(200);

    const deletedUser = await response.json();
    expect(deletedUser.id, "The deletion response should identify the deleted user.").toBe(USER_ID);
  });

  // ---------------------------------------------------------
  // Carts - GET
  // ---------------------------------------------------------

  test("GET - All Carts @master @sanity @api", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${Routes.GET_ALL_CARTS}`);

    expect(response.status(), "Retrieving carts should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The carts response should be an array.").toBeTruthy();
    expect(carts.length, "At least one cart should be returned.").toBeGreaterThan(0);
    carts.forEach((cart: unknown) =>
      expectSchema(validateCartSchema, cart, "Cart response should match its schema"),
    );
  });

  test("GET - Cart by ID @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_CART_BY_ID.replace("{id}", String(CART_ID));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving a cart by ID should return HTTP 200.").toBe(200);

    const cart = await response.json();
    expectSchema(validateCartSchema, cart, "Cart response should match its schema");
    expect(cart.id, "The response ID should match the requested cart ID.").toBe(CART_ID);
  });

  test("GET - Carts by Date Range @master @regression @api", async ({ request }) => {
    const route = Routes.GET_CARTS_BY_DATE_RANGE
      .replace("{startdate}", encodeURIComponent(START_DATE))
      .replace("{enddate}", encodeURIComponent(END_DATE));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Filtering carts by date should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The date-filtered carts response should be an array.").toBeTruthy();
    carts.forEach((cart: { date: string }) => {
      expectSchema(validateCartSchema, cart, "Cart response should match its schema");
      const cartDate = new Date(cart.date).toISOString().slice(0, 10);
      expect(
        cartDate >= START_DATE && cartDate <= END_DATE,
        "Each returned cart should fall within the requested date range.",
      ).toBeTruthy();
    });
  });

  test("GET - Carts by User @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_USER_CART.replace("{userId}", String(USER_ID));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving a user's carts should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The user's carts response should be an array.").toBeTruthy();
    carts.forEach((cart: { userId: number }) => {
      expectSchema(validateCartSchema, cart, "Cart response should match its schema");
      expect(cart.userId, "Each cart should belong to the requested user.").toBe(USER_ID);
    });
  });

  test("GET - Carts with Limit @master @sanity @api", async ({ request }) => {
    const route = Routes.GET_CARTS_WITH_LIMIT.replace("{limit}", String(LIMIT));
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Retrieving limited carts should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The limited carts response should be an array.").toBeTruthy();
    expect(carts.length, "The API should return the requested number of carts.").toBe(LIMIT);
    carts.forEach((cart: unknown) =>
      expectSchema(validateCartSchema, cart, "Cart response should match its schema"),
    );
  });

  test("GET - Carts Sorted Ascending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_CARTS_SORTED.replace("{order}", "asc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Ascending cart sorting should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The sorted carts response should be an array.").toBeTruthy();
    const cartIds = carts.map((cart: { id: number }) => cart.id);
    expect(cartIds, "Cart IDs should be in ascending order.").toEqual(
      [...cartIds].sort((firstId, secondId) => firstId - secondId),
    );
  });

  test("GET - Carts Sorted Descending @master @regression @api", async ({ request }) => {
    const route = Routes.GET_CARTS_SORTED.replace("{order}", "desc");
    const response = await request.get(`${BASE_URL}${route}`);

    expect(response.status(), "Descending cart sorting should return HTTP 200.").toBe(200);

    const carts = await response.json();
    expect(Array.isArray(carts), "The sorted carts response should be an array.").toBeTruthy();
    const cartIds = carts.map((cart: { id: number }) => cart.id);
    expect(cartIds, "Cart IDs should be in descending order.").toEqual(
      [...cartIds].sort((firstId, secondId) => secondId - firstId),
    );
  });

  // ---------------------------------------------------------
  // Carts - POST / PUT / DELETE
  // ---------------------------------------------------------

  test("POST - Create Cart @master @regression @api", async ({ request }) => {
    const payload = RandomDataUtil.generateCartPayload(USER_ID);
    const response = await request.post(`${BASE_URL}${Routes.CREATE_CART}`, {
      data: payload,
    });

    expect(response.status(), "Creating a cart should return HTTP 201.").toBe(201);

    const createdCart = await response.json();
    expect(Number.isInteger(createdCart.id), "The created cart should have an integer ID.").toBe(
      true,
    );
    expect(createdCart.userId, "The created cart should belong to the requested user.").toBe(
      payload.userId,
    );
    expect(createdCart.products, "The created cart should contain the submitted products.").toEqual(
      payload.products,
    );
  });

  test("PUT - Update Cart @master @regression @api", async ({ request }) => {
    const route = Routes.GET_CART_BY_ID.replace("{id}", String(CART_ID));
    const existingCartResponse = await request.get(`${BASE_URL}${route}`);
    expect(existingCartResponse.status(), "The existing cart should be available for update.").toBe(
      200,
    );

    const existingCart = await existingCartResponse.json();
    expect(
      Array.isArray(existingCart.products) && existingCart.products.length > 0,
      "The existing cart should contain a product whose quantity can be changed.",
    ).toBeTruthy();

    const payload = RandomDataUtil.generateUpdatedCartPayload(existingCart.userId);
    const firstProductQuantity = existingCart.products[0].quantity;
    payload.products = existingCart.products.map(
      (product: { productId: number; quantity: number }, index: number) => ({
        productId: product.productId,
        quantity: index === 0 ? firstProductQuantity + 1 : product.quantity,
      }),
    );

    const updateRoute = Routes.UPDATE_CART.replace("{id}", String(CART_ID));
    const response = await request.put(`${BASE_URL}${updateRoute}`, { data: payload });

    expect(response.status(), "Updating a cart should return HTTP 200.").toBe(200);

    const updatedCart = await response.json();
    expect(updatedCart.id, "The response ID should match the requested cart ID.").toBe(CART_ID);
    expect(updatedCart.userId, "The updated cart should retain its user ID.").toBe(
      existingCart.userId,
    );
    expect(updatedCart.products, "The cart response should reflect the updated products.").toEqual(
      payload.products,
    );
    expect(
      updatedCart.products[0].quantity,
      "The first product quantity should increase from its previous value.",
    ).toBe(firstProductQuantity + 1);
  });

  test("DELETE - Cart @master @regression @api", async ({ request }) => {
    const route = Routes.DELETE_CART.replace("{id}", String(CART_ID));
    const response = await request.delete(`${BASE_URL}${route}`);

    expect(response.status(), "Deleting a cart should return HTTP 200.").toBe(200);

    const deletedCart = await response.json();
    expect(deletedCart.id, "The deletion response should identify the deleted cart.").toBe(CART_ID);
  });
});
