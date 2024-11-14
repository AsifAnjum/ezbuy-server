const express = require("express");
const productController = require("../controllers/productController");
const { verifyToken } = require("../middleware/verifyToken");
const { uploader } = require("../middleware/uploader");
const authorization = require("../middleware/authorization");
const {
  moderator,
  admin,
  productManager,
  user,
} = require("../utils/constants");

const router = express.Router();

router
  .route("/")
  .get(productController.fetchAllProducts)
  .post(
    verifyToken,
    authorization(productManager, admin, moderator),
    uploader.array("images", 4),
    productController.addProduct
  );

router.get(
  "/my-products",
  verifyToken,
  authorization(productManager, moderator, admin),
  productController.fetchSellerProducts
);

router
  .route("/:id")
  .get(productController.fetchProductById)
  .patch(
    verifyToken,
    authorization(productManager, moderator, admin),
    productController.updateProduct
  );
router.get("/offer", productController.fetchOfferProducts);
router.get("/best-seller", productController.fetchBestSellingProducts);

router.patch(
  "/:id/update-images",
  verifyToken,
  authorization(productManager, admin, moderator),

  uploader.array("images"),
  productController.updateProductImage
);

router.patch(
  "/:id/delete-image",
  verifyToken,
  authorization(productManager, admin, moderator),

  productController.deleteProductImg
);

router.post(
  "/:id/review",
  verifyToken,
  authorization(user),
  productController.addProductReview
);

module.exports = router;
