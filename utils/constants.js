//user-role
exports.admin = "admin";
exports.moderator = "moderator";
exports.productManager = "product-manager";
exports.user = "user";
exports.active = "active";
exports.inactive = "inactive";
exports.blocked = "blocked";

//product
exports.continued = "continued";
exports.discontinued = "discontinued";

//order
exports.pending = "pending";
exports.onTheWay = "onTheWay";
exports.delivered = "delivered";
exports.canceled = "canceled";
exports.reached = "reached";

//payment status
exports.success = "success";
exports.failed = "failed";

//message
exports.solved = "solved";
exports.rejected = "rejected";

exports.token = (req) => {
  return req?.headers?.authorization?.split(" ")?.[1];
};
