const { response } = require("../utils/helperFunctions");

module.exports = (...role) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!role.includes(userRole)) {
      return response(res, 403, false, "You are not authorized");
    }
    next();
  };
};
