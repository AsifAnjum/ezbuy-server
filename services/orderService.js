const Order = require("../models/Order");

exports.addOrderService = async (data) => {
  return await Order.create(data);
};

exports.getUserOrderService = async (filters, queries) => {
  const order = await Order.find(filters)
    .sort(queries.sortBy)
    .skip(queries.skip)
    .limit(queries.limit);

  const total = await Order.countDocuments();
  const limit = queries.limit;
  const page = Math.ceil(total / limit);
  return { total, page, limit, order };
};
