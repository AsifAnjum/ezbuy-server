const jwt = require("jsonwebtoken");

exports.generateToken = (userInfo) => {
  const payload = {
    id: userInfo._id,
    name: userInfo.fullName,
    email: userInfo.email,
    role: userInfo.role,
  };

  const token = jwt.sign(payload, process.env.CRYPTO_TOKEN, {
    expiresIn: "1d",
  });

  return token;
};

//? add blacklist token
//? or just store in database
exports.revokedToken = new Set();

exports.getToken = (req) => {
  return req.headers?.authorization?.split(" ")?.[1];
};
