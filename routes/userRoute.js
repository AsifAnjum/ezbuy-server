const express = require("express");
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/verifyToken");
const { uploader } = require("../middleware/uploader");
const authorization = require("../middleware/authorization");
const { user } = require("../utils/constants");
const router = express.Router();

router.post("/signup", userController.signup);

router.post("/login", userController.login);

//google auth

// router.get("/auth/google", userController.googleAuth);

router.get("/auth/google/callback/", userController.googleAuthCallback);

router.get("/me", verifyToken, userController.getMe);

router.patch(
  "/upload-image",
  verifyToken,
  uploader.single("image"),
  userController.updateUserImage
);
router.patch("/update-profile", verifyToken, userController.updateUserProfile);

router.patch("/update-password", verifyToken, userController.updatePassword);

router.post("/reset-password", userController.resetPasswordToken);

router
  .route("/reset-password/:token")
  .get(userController.getResetToken)
  .patch(userController.resetPassword);

router.get(
  "/dashboard-analytics",
  verifyToken,
  authorization(user),
  userController.dashboardAnalytics
);

router.post("/logout", verifyToken, userController.logout);
module.exports = router;
