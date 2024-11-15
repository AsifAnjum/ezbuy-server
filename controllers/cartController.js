const {
  getCartByUserIdService,
  createCartService,
} = require("../services/cartService");
const {
  getProductByIdService,
  getProductStockByIdService,
} = require("../services/productService");
const { response } = require("../utils/helperFunctions");

exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?.id;

    const product = await getProductByIdService(productId);

    if (!product) {
      return response(res, 404, false, "Product not found");
    }

    if (product.stock < 1) {
      return response(res, 400, false, "Product out of stock");
    }

    let cart = await getCartByUserIdService(userId);

    if (!cart) {
      cart = await createCartService({
        userId,
        products: [],
      });
    }

    const productIndex = cart.products.findIndex(
      (p) => p.productId.toString() === productId.toString()
    );

    // another approach, if product already in cart, just increase quantity. then i have to validate product stock  before increasing quantity

    if (productIndex === -1) {
      cart.products.push({
        productId,
        title: product.title,
        price: product.sale > 0 ? product.salePrice : product.price,
        img: product.imgUrls[0],
        quantity: 1,
      });
    } else {
      return response(res, 400, false, "Product already in cart");
    }
    await cart.save();

    response(res, 200, true, "Product added to cart", null, cart);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    const cart = await getCartByUserIdService(userId);

    response(res, 200, true, null, null, cart || {});
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.updateCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    const cart = await getCartByUserIdService(userId);

    for (const product of req.body) {
      const { stock: productStock } = await getProductStockByIdService(
        product.productId
      );

      const productIndex = cart.products.findIndex(
        (p) => p.productId.toString() === product.productId.toString()
      );

      if (productStock <= 0) {
        return response(
          res,
          400,
          false,
          `${cart.products[productIndex].title} is out of stock`
        );
      }

      if (product.quantity > productStock) {
        return response(
          res,
          400,
          false,
          `Requested quantity for ${cart.products[productIndex].title} exceeds available stock`
        );
      }

      if (productIndex > -1) {
        cart.products[productIndex].quantity = product.quantity;
      }
    }

    await cart.save();

    response(res, 200, true, "Cart updated successfully", null, cart);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    const cart = await getCartByUserIdService(userId);

    if (!cart) {
      return response(res, 404, false, "Cart not found");
    }

    await cart.deleteOne();

    response(res, 200, true, "Cart cleared successfully");
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?.id;
    const cart = await getCartByUserIdService(userId);

    if (!cart) {
      return response(res, 404, false, "Cart not found");
    }

    cart.products = cart.products.filter(
      (p) => p.productId.toString() !== productId.toString()
    );

    if (cart.products.length === 0) {
      await cart.deleteOne();
      return response(res, 200, true, "Cart cleared successfully");
    }
    await cart.save();

    response(res, 200, true, "Product removed from cart", null, cart);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};
