const express = require("express");
const couponController = require("../controllers/adminController");
const { verifyToken } = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");
const { admin, moderator, user } = require("../utils/constants");

const router = express.Router();

router
  .route("/")
  .get(verifyToken, couponController.fetchAllCoupon)
  .post(
    verifyToken,
    authorization(admin, moderator),
    couponController.addCoupon
  );

router.get(
  "/:code",
  verifyToken,
  authorization(user),
  couponController.getCoupon
);

router.get(
  "/staff/:code",
  verifyToken,
  authorization(admin, moderator),
  couponController.fetchCouponByStaff
);

router
  .route("/:id")
  .patch(
    verifyToken,
    authorization(admin, moderator),
    couponController.updateCoupon
  )
  .delete(verifyToken, authorization(admin), couponController.removeCoupon);

module.exports = router;
