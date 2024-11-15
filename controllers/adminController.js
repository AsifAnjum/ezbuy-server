const { default: mongoose } = require("mongoose");
const {
  getAllUsersService,
  findUserByAdminService,
  updateUserByAdminService,
  productBulkUpdateByAdminService,
  userBulkUpdateByAdminService,
  createCouponService,
  getCouponService,
  deleteCouponService,
  getAllCouponService,
  getOrderByStaffService,
  getOrderByIdStaffService,
  dashboardUserDataService,
  dashboardProductService,
  dashboardOrderService,
  removeProductByAdminService,
} = require("../services/adminService");
const { admin, blocked, moderator } = require("../utils/constants");
const { response, isObjEmpty } = require("../utils/helperFunctions");
const { blacklistToken } = require("../utils/token");
const { getProductByIdService } = require("../services/productService");
const { deleteImgFromFirebase } = require("../middleware/uploader");

//! user
exports.fetchAllUser = async (req, res) => {
  try {
    let filters = {};
    const queries = {};

    if (req.query.search) {
      filters = {
        ...filters,
        $or: [
          { fullName: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    if (req.query.status) {
      filters = {
        ...filters,
        status: req.query.status,
      };
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    queries.skip = skip;
    queries.limit = parseInt(limit);

    const users = await getAllUsersService(queries, filters);
    response(res, 200, true, null, null, users);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.fetchUserByAdmin = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await findUserByAdminService({ _id: userId });
    response(res, 200, true, null, null, user);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id: _id, email, role } = req.body;

    const userInfo = _id ? { _id } : { email };

    if (req.user.id == _id || req.user.email == email) {
      return response(res, 400, false, "You can not update your own role");
    }

    const updateUser = await updateUserByAdminService(userInfo, { role });

    if (updateUser.modifiedCount == 0) {
      return response(
        res,
        400,
        false,
        "failed to update, please check user info"
      );
    }

    response(res, 200, true, "successfully updated");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id: _id, email, status } = req.body;

    const userInfo = _id ? { _id } : { email };

    if (req.user.id == _id || req.user.email == email) {
      return response(res, 400, false, "You can not update your own role");
    }

    const updateUser = await updateUserByAdminService(userInfo, { status });

    if (updateUser.modifiedCount == 0) {
      return response(
        res,
        400,
        false,
        "failed to update, please check user info"
      );
    }

    response(res, 200, true, "successfully updated");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.userCollectionInsertField = async (req, res) => {
  try {
    const filterFieldArray = ["buyerInfo", "sellerInfo", "password", "email"];
    const isFieldExist = restrictField(filterFieldArray, req.body);

    if (isFieldExist) {
      return response(res, 400, false, "You can not modify these field", null, {
        restrictField: filterFieldArray,
      });
    }
    const result = await userBulkUpdateByAdminService({});
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

//! product
exports.productCollectionUpdate = async (req, res) => {
  try {
    const result = await productBulkUpdateByAdminService({});
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await getProductByIdService(productId);

    if (!product) {
      return response(res, 404, false, "Product not found");
    }

    const imgUrls = product.imgUrls;

    await product.deleteOne();

    deleteImgFromFirebase(imgUrls).then().catch();

    response(res, 200, true, "Product deleted successfully");
  } catch (error) {}
};

//? coupon
exports.addCoupon = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;

    const { discount } = req.body;

    if (discount < 0 || discount > 100) {
      return response(res, 400, false, "Discount must be between 0 and 100");
    }

    if (discount % 1 !== 0) {
      return response(res, 400, false, "Discount must be an integer");
    }

    if (discount > 15 && userRole !== admin) {
      return response(
        res,
        400,
        false,
        "You are not authorized to add more than 15% discount"
      );
    }

    const data = {
      ...req.body,
      createdBy: userId,
    };

    await createCouponService(data);

    response(res, 200, true, "Coupon generated successfully");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const { code } = req.params;

    const coupon = await getCouponService({ code });

    if (!coupon) {
      return response(res, 404, false, "Coupon is not valid");
    }

    if (
      coupon.status === blocked ||
      coupon.expiryDate < new Date() ||
      coupon.stock < 1
    ) {
      return response(res, 400, false, "Coupon is expired");
    }

    response(res, 200, true, null, null, coupon);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.fetchCouponByStaff = async (req, res) => {
  try {
    const { code } = req.params;

    const { id, role } = req.user;

    const coupon = await getCouponService({ code });

    if (!coupon) {
      return response(res, 404, false, "Coupon is not valid");
    }

    if (role === moderator && coupon.createdBy.toString() !== id) {
      return response(
        res,
        403,
        false,
        "You are not authorized to view other user's coupon"
      );
    }

    response(res, 200, true, null, null, coupon);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.fetchAllCoupon = async (req, res) => {
  try {
    const { id, role } = req.user;
    const filters = {};
    const queries = {};

    if (role === moderator) {
      filters.createdBy = id;
    }

    if (req.query.search) {
      filters.code = { $regex: req.query.search, $options: "i" };
    }

    if (req.query.status) {
      filters.status = req.query.status;
    }

    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * parseInt(limit);
    queries.skip = skip;
    queries.limit = parseInt(limit);

    const coupons = await getAllCouponService(filters, queries);

    response(res, 200, true, null, null, coupons);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { id: couponId } = req.params;
    const { id, role: userRole } = req.user;

    const coupon = await getCouponService({ _id: couponId });

    if (!coupon) {
      return response(res, 404, false, "Coupon not found");
    }

    if (userRole === moderator) {
      if (coupon.createdBy.toString() !== id) {
        return response(
          res,
          403,
          false,
          "You are not authorized to update other user's coupon"
        );
      }

      if (coupon.discount > 15) {
        return response(
          res,
          400,
          false,
          "You are not authorized to add more than 15% discount"
        );
      }
    }

    for (let field in req.body) {
      coupon[field] = req.body[field];
    }

    await coupon.save();

    response(res, 200, true, "Coupon updated successfully", null, coupon);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.removeCoupon = async (req, res) => {
  try {
    const { id: couponId } = req.params;

    const result = await deleteCouponService(couponId);

    response(res, 200, true, "Coupon deleted successfully");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

//? order
exports.fetchOrders = async (req, res) => {
  try {
    let filters = {};
    const queries = {};

    if (req.query.search) {
      // filters = {
      //   ...filters,
      //   $or: [
      //     { userEmail: { $regex: req.query.search, $options: "i" } },
      //     ...(mongoose.Types.ObjectId.isValid(req.query.search)
      //       ? [{ _id: req.query.search }]
      //       : []
      //     ),
      //   ],
      // };

      if (mongoose.Types.ObjectId.isValid(req.query.search)) {
        filters._id = req.query.search;
      } else {
        filters.userEmail = { $regex: req.query.search, $options: "i" };
      }
    }

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

    const orders = await getOrderByStaffService(filters, queries);
    response(res, 200, true, "Orders fetched successfully", null, orders);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.fetchOrderById = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await getOrderByIdStaffService(orderId);

    if (!order) {
      return response(res, 404, false, "Order not found");
    }

    response(res, 200, true, "Order fetched successfully", null, order);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const { id, name, email, role } = req.user;

    if (isObjEmpty(req.body)) {
      return response(res, 400, false, "Please provide data to update");
    }

    const order = await getOrderByIdStaffService(orderId);

    if (!order) {
      return response(res, 404, false, "Order not found");
    }

    if ("name" in req.body) {
      order.shippingAddress.name = req.body.name;
    }
    if ("phone" in req.body) {
      order.shippingAddress.phone = req.body.phone;
    }
    if ("streetAddress" in req.body) {
      order.shippingAddress.streetAddress = req.body.streetAddress;
    }

    if ("city" in req.body) {
      order.shippingAddress.city = req.body.city;
    }

    if ("deliveryStatus" in req.body) {
      if (
        order.paymentDetails.status === "failed" ||
        req.body?.paymentStatus === "failed"
      ) {
        return response(
          res,
          400,
          false,
          "You can not update delivery status because payment status is failed"
        );
      }
      order.deliveryStatus = req.body.deliveryStatus;
    }

    if ("paymentStatus" in req.body) {
      if (req.body.paymentStatus === "failed") {
        order.deliveryStatus = "canceled";
      }
      order.paymentDetails.status = req.body.paymentStatus;
    }

    order.actionBy = {
      id,
      name,
      email,
      role,
    };

    await order.save();

    response(res, 200, true, "Order updated successfully", null, order);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.dashboardAnalytics = async (req, res) => {
  try {
    const userAnalytics = await dashboardUserDataService();

    const productAnalytics = await dashboardProductService();

    const orderAnalytics = await dashboardOrderService();

    response(res, 200, true, "User data fetched successfully", null, {
      user: userAnalytics,
      product: productAnalytics,
      order: orderAnalytics,
    });
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};
