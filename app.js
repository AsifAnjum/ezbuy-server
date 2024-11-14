const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cookieParser = require("cookie-parser");

const { response } = require("./utils/helperFunctions");

const app = express();

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

//routes import
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const adminRoute = require("./routes/adminRoute");
const cartRoute = require("./routes/cartRoute");
const messageRoute = require("./routes/messageRoute");
const couponRoute = require("./routes/couponRoute");
const orderRoute = require("./routes/orderRoute");

app.get("/", (req, res) => {
  res.send("Hola!");
});

const apiV1 = "/api/v1";

app.use(`${apiV1}/user`, userRoute);
app.use(`${apiV1}/product`, productRoute);
app.use(`${apiV1}/admin`, adminRoute);
app.use(`${apiV1}/cart`, cartRoute);
app.use(`${apiV1}/message`, messageRoute);
app.use(`${apiV1}/coupon`, couponRoute);
app.use(`${apiV1}/order`, orderRoute);

//default error
const errorHandler = (error, req, res, next) => {
  console.log("Error handler triggered");
  if (error instanceof multer.MulterError) {
    return response(res, error.statusCode || 400, false, error.message, error);
  }

  if (error instanceof SyntaxError) {
    return response(res, 400, false, "Invalid format", error);
  }

  if (error instanceof ReferenceError) {
    return response(res, 500, false, "Internal Server Error", error);
  }

  return response(res, error.statusCode || 500, false, error.message);
};

app.use(errorHandler);

//non-exist routes
app.all("*", (req, res) => {
  response(res, 404, false, "Invalid Address");
});

module.exports = app;
