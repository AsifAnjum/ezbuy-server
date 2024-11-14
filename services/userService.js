const Order = require("../models/Order");
const User = require("../models/User");

const { createFromHexString: ObjectId } = require("mongoose").Types.ObjectId;

exports.signupService = async (userInfo) => {
  return await User.create(userInfo);
};

exports.findUserByEmailService = async (email) => {
  return await User.findOne({ email });
};
exports.findUserByTokenService = async (token) => {
  return await User.findOne({ passwordResetToken: token });
};

exports.findUserByIdService = async (userId, options) => {
  return await User.findById(userId, options);
};

exports.updateUserService = async (userId, userData) => {
  return await User.updateOne({ _id: userId }, userData, {
    runValidators: true,
  }); // data = {fieldName: value}
};

exports.dashboardUserDataService = async (userId) => {
  const userDataAnalytics = await User.aggregate([
    {
      $match: {
        _id: ObjectId(userId),
      },
    },
    {
      $project: {
        _id: 0,
        fullName: 1,
        email: 1,
        gender: 1,
        status: 1,
        role: 1,
        lastLogin: 1,
        passwordChangedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return userDataAnalytics.length > 0 ? userDataAnalytics[0] : null;
};

exports.dashboardOrderDataService = async (userId) => {
  // const orderDataAnalytics = Order.aggregate([
  //   // Match documents for the specific customer
  //   {
  //     $match: {
  //       userId: ObjectId(userId),
  //     },
  //   },
  //   {
  //     $addFields: {
  //       discountAmount: {
  //         $cond: {
  //           if: { $eq: ["$couponDiscount", 0] },
  //           then: 0,
  //           else: {
  //             $subtract: [
  //               {
  //                 $divide: [
  //                   "$totalAmount",
  //                   { $subtract: [1, { $divide: ["$couponDiscount", 100] }] },
  //                 ],
  //               },
  //               "$totalAmount",
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: 1,
  //       totalDiscount: { $sum: "$discountAmount" },
  //       totalPaidAmount: {
  //         $sum: {
  //           $cond: {
  //             if: { $eq: ["$paymentDetails.status", "success"] },
  //             then: "$totalAmount",
  //             else: 0,
  //           },
  //         },
  //       },
  //       orderInfo: {
  //         $push: {
  //           orderId: "$_id",
  //           orderStatus: "$orderStatus",
  //           totalAmount: "$totalAmount",
  //           paymentStatus: "$paymentDetails.status",
  //           createdAt: "$createdAt",
  //         },
  //       },
  //     },
  //   },

  //   {
  //     $project: {
  //       _id: 0,
  //       totalDiscount: { $trunc: ["$totalDiscount", 2] },
  //       totalPaidAmount: { $trunc: ["$totalPaidAmount", 2] },
  //       orderInfo: 1,
  //     },
  //   },
  // ]);

  const orderDataAnalytics = await Order.aggregate([
    // Match documents for the specific customer
    {
      $match: {
        userId: ObjectId(userId),
      },
    },
    // Sort all documents by createdAt in descending order
    {
      $sort: { createdAt: -1 },
    },

    // Add the discountAmount field
    {
      $addFields: {
        discountAmount: {
          $cond: {
            if: { $eq: ["$couponDiscount", 0] },
            then: 0,
            else: {
              $subtract: [
                {
                  $divide: [
                    "$totalAmount",
                    { $subtract: [1, { $divide: ["$couponDiscount", 100] }] },
                  ],
                },
                "$totalAmount",
              ],
            },
          },
        },
      },
    },
    // Facet to separate the recent orders and all orders data
    {
      $facet: {
        recentOrders: [
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              orderStatus: 1,
              totalAmount: 1,
              deliveryStatus: 1,
              products: 1,
              totalItems: { $sum: "$products.quantity" },
              "paymentDetails.status": 1,
              createdAt: 1,
            },
          },
        ],
        allOrdersData: [
          {
            $group: {
              _id: null,
              totalDiscount: { $sum: "$discountAmount" },
              totalOrders: { $sum: 1 },
              overAllTotalItems: {
                $sum: {
                  $reduce: {
                    input: "$products", // The products array
                    initialValue: 0, // Start with a sum of 0
                    in: { $add: ["$$value", "$$this.quantity"] }, // Add quantity of each product to the sum
                  },
                },
              },
              totalPaidAmount: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$paymentDetails.status", "success"] },
                    then: "$totalAmount",
                    else: 0,
                  },
                },
              },
            },
          },
        ],
      },
    },
    // Reshape the output
    {
      $project: {
        totalDiscount: {
          $trunc: [{ $arrayElemAt: ["$allOrdersData.totalDiscount", 0] }, 2],
        },
        totalPaidAmount: {
          $trunc: [{ $arrayElemAt: ["$allOrdersData.totalPaidAmount", 0] }, 2],
        },
        totalOrders: { $arrayElemAt: ["$allOrdersData.totalOrders", 0] },
        overAllTotalItems: {
          $arrayElemAt: ["$allOrdersData.overAllTotalItems", 0],
        },
        orderInfo: {
          $map: {
            input: "$recentOrders",
            as: "order",
            in: {
              orderId: "$$order._id",
              orderDate: "$$order.createdAt",
              products: "$$order.products",
              orderStatus: "$$order.orderStatus",
              totalItems: "$$order.totalItems",
              totalAmount: "$$order.totalAmount",
              deliveryStatus: "$$order.deliveryStatus",
              paymentStatus: "$$order.paymentDetails.status",
            },
          },
        },
      },
    },
  ]);
  return orderDataAnalytics;
};
