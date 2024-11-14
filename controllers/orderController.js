const { getCouponService } = require("../services/adminService");
const { getCartByUserIdService } = require("../services/cartService");
const {
  addOrderService,
  getUserOrderService,
} = require("../services/orderService");
const { bulkUpdateProductService } = require("../services/productService");
const { blocked } = require("../utils/constants");
const { response } = require("../utils/helperFunctions");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      products,
      totalAmount,
      shippingAddress,
      couponCode,
      couponDiscount,
    } = req.body;
    const { id, email } = req.user;

    const shipping = {
      name: shippingAddress.name,
      address: {
        line1: shippingAddress.streetAddress,
        city: shippingAddress.city,
      },
      phone: shippingAddress.phone,
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100,
      currency: "usd",
      payment_method_types: ["card"],
      receipt_email: email,

      shipping: shipping,
      description: `Payment for ${products.length} products`,
      metadata: {
        couponCode,
        couponDiscount,
      },
    });

    const { amount, client_secret } = paymentIntent;

    response(res, 200, true, "Payment intent created", null, {
      client_secret,
      amount: amount / 100,
    });
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const {
      products,
      totalAmount,
      shippingAddress,
      paymentDetails,
      couponCode,
      couponDiscount,
      redirect,
      shippingCharges,
    } = req.body;

    const { id, email } = req.user;

    const updates = products.map((product) => ({
      updateOne: {
        filter: { _id: product.productId },
        update: {
          $inc: { sold: product.quantity, stock: -product.quantity },
        },
      },
    }));

    const productUpdate = await bulkUpdateProductService(updates);

    if (couponCode) {
      const coupon = await getCouponService({ code: couponCode });

      if (coupon) {
        if (coupon.stock < 1) {
          coupon.status = blocked;
        } else {
          coupon.stock -= 1;
        }
        coupon.used += 1;
        await coupon.save().catch(() => {});
      }
    }

    if (redirect) {
      const cart = await getCartByUserIdService(id);

      if (cart) {
        await cart.deleteOne().catch(() => {});
      }
    }

    const productsData = products.map((product) => ({
      productId: product.productId,
      title: product.title,
      price: product.price,
      quantity: product.quantity,
    }));

    const paymentDetail = {
      method: paymentDetails.method,
      transactionId: paymentDetails?.transactionId || "",
      status: paymentDetails.status,
    };
    const shippingDetails = {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      streetAddress: shippingAddress.streetAddress,
      city: shippingAddress.city,
    };

    const orderData = {
      userId: id,
      userEmail: email,
      products: productsData,
      totalAmount,
      couponCode: couponCode || "",
      couponDiscount: couponDiscount || 0,
      shippingAddress: shippingDetails,
      paymentDetails: paymentDetail,
      shippingCharges: shippingCharges || 0,
    };

    const order = await addOrderService(orderData);

    response(res, 201, true, "Order placed successfully");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.fetchOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const filters = {};
    const queries = {};

    filters.userId = userId;

    if (req.query.deliveryStatus) {
      filters.deliveryStatus = req.query.deliveryStatus;
    }

    if (req.query.paymentStatus) {
      filters["paymentDetails.status"] = req.query.paymentStatus;
    }

    queries.sortBy = "-createdAt";

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    queries.skip = skip;
    queries.limit = parseInt(limit);

    const orders = await getUserOrderService(filters, queries);
    response(res, 200, true, "Orders fetched successfully", null, orders);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};
