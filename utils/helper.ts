export class Helper {
  static convertPriceToNumber(price: string): number {
    return Number(price.replace(/[^\d.]/g, ""));
  }

  static getProductDetails() {
    const productName = process.env.PRODUCT_NAME;
    const productQuantity = process.env.PRODUCT_QUANTITY;
    const totalPrice = process.env.TOTAL_PRICE;

    if (!productName || !productQuantity || !totalPrice) {
      throw new Error("PRODUCT_NAME, PRODUCT_QUANTITY, and TOTAL_PRICE must be set in the environment.");
    }

    return {
      productName,
      productQuantity,
      totalPrice,
    };
  }

  static getLoginDetails() {
    const email = process.env.APP_EMAIL;
    const password = process.env.APP_PASSWORD;

    if (!email || !password) {
      throw new Error("APP_EMAIL and APP_PASSWORD must be set in the environment.");
    }

    return {
      email,
      password,
    };
  }
}
