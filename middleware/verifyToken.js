const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const { response } = require("../utils/helperFunctions");
const { revokedToken, getToken } = require("../utils/token");

exports.verifyToken = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return response(res, 401, false, "You are not logged in");
    }

    if (revokedToken.has(token)) {
      return response(res, 401, false, "please login");
    }

    const decoded = await promisify(jwt.verify)(
      token,
      process.env.CRYPTO_TOKEN
    );

    req.user = decoded;

    next();
  } catch (error) {
    response(res, 401, false, "please login", error);
  }
};
