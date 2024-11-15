const express = require("express");
const orderController = require("../controllers/orderController");
const { verifyToken } = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");
const { user } = require("../utils/constants");

const router = express.Router();

router.post(
  "/create-payment-intent",
  verifyToken,
  orderController.createPaymentIntent
);

router.post("/", verifyToken, authorization(user), orderController.placeOrder);

//  Get all orders
router.get("/", verifyToken, authorization(user), orderController.fetchOrders);

module.exports = router;
