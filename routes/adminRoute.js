const express = require("express");
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middleware/verifyToken");
const { uploader } = require("../middleware/uploader");
const authorization = require("../middleware/authorization");
const { seller, moderator, admin } = require("../utils/constants");

const router = express.Router();

router.get(
  "/users",
  verifyToken,
  authorization(moderator, admin),
  adminController.fetchAllUser
);

router.get(
  "/user/:id",
  verifyToken,
  authorization(moderator, admin),
  adminController.fetchUserByAdmin
);

router.patch(
  "/user/update-role",
  verifyToken,
  authorization(admin),
  adminController.updateUserRole
);
router.patch(
  "/user/update-status",
  verifyToken,
  authorization(admin, moderator),
  adminController.updateUserStatus
);

router.delete(
  "/product/:id",
  verifyToken,
  authorization(admin),
  adminController.deleteProduct
);

router.get(
  "/orders",
  verifyToken,
  authorization(moderator, admin),
  adminController.fetchOrders
);

router
  .route("/order/:id")
  .get(
    verifyToken,
    authorization(admin, moderator),
    adminController.fetchOrderById
  )
  .patch(
    verifyToken,
    authorization(admin, moderator),
    adminController.updateOrder
  );

router.get(
  "/dashboard-analytics",
  verifyToken,
  authorization(admin, moderator),
  adminController.dashboardAnalytics
);

module.exports = router;
