const User = require("../models/User");
const { admin } = require("../utils/constants");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");

//?user
exports.getAllUsersService = async (queries, filters) => {
  const users = await User.find(filters)
    .skip(queries.skip)
    .limit(queries.limit)
    .select("-password");
  console.log(users);
  const total = await User.countDocuments(filters);
  const limit = queries.limit;
  const page = Math.ceil(total / limit);

  return { total, page, limit, users };
};

exports.findUserByAdminService = async (queryObj) => {
  return await User.findOne(queryObj).select("-password");
  // .populate("sellerInfo.products");
  // .populate("buyerInfo.order");

  // return await User.aggregate([
  //   {
  //     $match: {
  //       _id: new ObjectId(queryObj._id),
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "products",
  //       localField: "sellerInfo.products",
  //       foreignField: "_id",
  //       as: "result",
  //     },
  //   },
  // ]);
};

exports.updateUserByAdminService = async (userInfo, data) => {
  const result = await User.updateOne(
    { ...userInfo, role: { $ne: admin } },
    data,
    {
      runValidators: true,
    }
  );

  return result;
};

exports.userBulkUpdateByAdminService = async (data) => {
  return await User.updateMany(
    {},
    { $setOnInsert: data },
    {
      runValidators: true,
    }
  );
};

//!product
exports.productBulkUpdateByAdminService = async (filter, data) => {
  return await Product.updateMany(
    filter,
    { $set: data },
    {
      runValidators: true,
    }
  );
};

exports.removeProductByAdminService = async (id) => {
  return await Product.deleteOne({ _id: id });
};

//? coupon
exports.createCouponService = async (data) => {
  return await Coupon.create(data);
};

exports.getCouponService = async (filter) => {
  return await Coupon.findOne(filter);
};

exports.getAllCouponService = async (filters, queries) => {
  const coupons = await Coupon.find(filters)
    .skip(queries.skip)
    .limit(queries.limit);

  const total = await Coupon.countDocuments(filters);
  const limit = queries.limit;
  const page = Math.ceil(total / limit);
  return { total, page, limit, coupons };
};

exports.deleteCouponService = async (id) => {
  return await Coupon.findByIdAndDelete(id);
};

//? order
exports.getOrderByStaffService = async (filters, queries) => {
  const order = await Order.find(filters)
    .sort(queries.sortBy)
    .skip(queries.skip)
    .limit(queries.limit);

  const total = await Order.countDocuments(filters);
  const limit = queries.limit;
  const page = Math.ceil(total / limit);
  return { total, page, limit, order };
};

exports.getOrderByIdStaffService = async (id) => {
  return await Order.findById(id);
};

exports.dashboardUserDataService = async () => {
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
  const twelveMonthsAgo = new Date(
    new Date().setMonth(new Date().getMonth() - 12)
  );

  const userAnalytics = await User.aggregate([
    {
      $match: {
        role: { $nin: ["admin", "moderator"] },
      },
    },
    {
      $facet: {
        totalUsers: [{ $count: "count" }],
        newUsersLast12Months: [
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              newUsers: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 },
          },
          {
            $limit: 12,
          },
          {
            $project: {
              _id: 0,
              year: "$_id.year",
              month: "$_id.month",
              // month: {
              //   $switch: {
              //     branches: [
              //       { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
              //       { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
              //       { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
              //       { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
              //       { case: { $eq: ["$_id.month", 5] }, then: "May" },
              //       { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
              //       { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
              //       { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
              //       { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
              //       { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
              //       { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
              //       { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
              //     ],
              //     default: "Unknown",
              //   },
              // },
              newUsers: 1,
            },
          },
        ],
        activeUsersLast30Days: [
          {
            $match: {
              lastLogin: { $gte: thirtyDaysAgo },
            },
          },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        totalUsers: { $arrayElemAt: ["$totalUsers.count", 0] },
        newUsersLast12Months: 1,
        activeUsersLast30Days: {
          $arrayElemAt: ["$activeUsersLast30Days.count", 0],
        },
      },
    },
  ]);

  return userAnalytics.length > 0 ? userAnalytics[0] : null;
};

exports.dashboardProductService = async () => {
  // Aggregation to get total number of products, top-selling products, highest view counts, and products with high views but low sales
  const productAnalytics = await Product.aggregate([
    // Total Number of Products
    {
      $facet: {
        totalProducts: [{ $count: "total" }],
        topSellingProducts: [
          { $match: { sold: { $gt: 0 } } },
          { $sort: { sold: -1 } },
          { $limit: 5 },
          { $project: { title: 1, sold: 1 } },
        ],
        highestViews: [
          { $match: { views: { $gt: 0 } } },
          { $sort: { views: -1 } },
          { $limit: 5 },
          { $project: { title: 1, views: 1 } },
        ],
        top5CategorySales: [
          { $match: { sold: { $gt: 0 } } },
          {
            $group: {
              _id: "$category",
              totalSales: { $sum: "$sold" },
            },
          },
          { $sort: { totalSales: -1 } },

          { $limit: 5 },

          { $project: { _id: 0, category: "$_id", totalSales: 1 } },
        ],
      },
    },
    {
      $project: {
        totalProducts: { $arrayElemAt: ["$totalProducts.total", 0] },
        topSellingProducts: 1,
        highestViews: 1,
        top5CategorySales: 1,
      },
    },
  ]);

  return productAnalytics.length > 0 ? productAnalytics[0] : null;
};

exports.dashboardOrderService = async () => {
  // const orderAnalytics = Order.aggregate([
  //   {
  //     $facet: {
  //       // Total Sales Revenue
  //       totalSalesRevenue: [
  //         {
  //           $group: {
  //             _id: null,
  //             totalRevenue: { $sum: "$totalAmount" },
  //           },
  //         },
  //         {
  //           $project: {
  //             _id: 0,
  //             totalRevenue: 1,
  //           },
  //         },
  //       ],

  //       // Average Order Value (AOV)
  //       averageOrderValue: [
  //         {
  //           $group: {
  //             _id: null,
  //             totalRevenue: { $sum: "$totalAmount" },
  //             totalOrders: { $sum: 1 },
  //           },
  //         },
  //         {
  //           $project: {
  //             _id: 0,
  //             averageOrderValue: { $divide: ["$totalRevenue", "$totalOrders"] },
  //           },
  //         },
  //       ],

  //       // Total Orders
  //       totalOrders: [
  //         {
  //           $count: "totalOrders",
  //         },
  //       ],

  //       // Order Status Breakdown
  //       orderStatusBreakdown: [
  //         {
  //           $group: {
  //             _id: "$deliveryStatus",
  //             count: { $sum: 1 },
  //           },
  //         },
  //         {
  //           $project: {
  //             _id: 1,
  //             count: 1,
  //             percentage: {
  //               $multiply: [
  //                 { $divide: ["$count", { $sum: "$$ROOT.totalOrders" }] },
  //                 100,
  //               ],
  //             },
  //           },
  //         },
  //       ],

  //       // Revenue Trends (Daily/Weekly)
  //       revenueTrends: [
  //         {
  //           $group: {
  //             _id: {
  //               $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
  //             },
  //             dailyRevenue: { $sum: "$totalAmount" },
  //           },
  //         },
  //         {
  //           $sort: { _id: 1 },
  //         },
  //       ],

  //       // Top Revenue-Generating Products
  //       topRevenueProducts: [
  //         {
  //           $unwind: "$products",
  //         },
  //         {
  //           $group: {
  //             _id: "$products.productId",
  //             productName: { $first: "$products.title" },
  //             totalRevenue: {
  //               $sum: { $multiply: ["$products.price", "$products.quantity"] },
  //             },
  //           },
  //         },
  //         {
  //           $sort: { totalRevenue: -1 },
  //         },
  //         {
  //           $limit: 5,
  //         },
  //       ],
  //     },
  //   },
  // ]);

  const orderAnalytics = await Order.aggregate([
    // Proceed with the original aggregation stages
    {
      $facet: {
        totalMetrics: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalOrders: { $sum: 1 },
            },
          },
        ],
        last12MonthsRevenue: [
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              totalMonthlyRevenue: { $sum: "$totalAmount" },
              totalOrders: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 },
          },
          {
            $limit: 12,
          },
          {
            $project: {
              _id: 0,
              year: "$_id.year",
              month: "$_id.month",
              totalMonthlyRevenue: 1,
              totalOrders: 1,
            },
          },
        ],
        orderStatusBreakdown: [
          {
            $group: {
              _id: "$deliveryStatus",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: "$_id",
              count: 1,
            },
          },
        ],
      },
    },

    // Additional calculations for averages and other fields
    {
      $addFields: {
        monthlyAverageRevenue: {
          $divide: [
            { $arrayElemAt: ["$totalMetrics.totalRevenue", 0] },
            {
              $size: "$last12MonthsRevenue",
            },
          ],
        },
      },
    },
    {
      $project: {
        totalRevenue: { $arrayElemAt: ["$totalMetrics.totalRevenue", 0] },
        totalOrders: { $arrayElemAt: ["$totalMetrics.totalOrders", 0] },
        last12MonthsRevenue: 1,
        monthlyAverageRevenue: 1,
        orderStatusBreakdown: 1,
      },
    },
  ]);

  return orderAnalytics.length > 0 ? orderAnalytics[0] : null;
};
