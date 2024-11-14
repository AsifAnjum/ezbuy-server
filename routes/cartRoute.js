const express = require("express");
const cartController = require("../controllers/cartController");
const { verifyToken } = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");
const { user } = require("../utils/constants");

const router = express.Router();

router
  .route("/")
  .get(verifyToken, cartController.getCart)
  .post(verifyToken, authorization(user), cartController.addToCart);

router.patch(
  "/update",
  verifyToken,
  authorization(user),
  cartController.updateCart
);

router.patch(
  "/clear",
  verifyToken,
  authorization(user),
  cartController.clearCart
);

router.patch(
  "/remove",
  verifyToken,
  authorization(user),
  cartController.removeFromCart
);

module.exports = router;
