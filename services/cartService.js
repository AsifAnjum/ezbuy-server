const Cart = require("../models/Cart");

exports.getCartByUserIdService = async (id) => {
  return await Cart.findOne({ userId: id });
};

exports.createCartService = async (data) => {
  return await Cart.create(data);
};
