const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri)
  .then(() => {
    console.log("successfully connected");
  })
  .catch((err) => console.log(`database error ${err}`));

app.listen(process.env.PORT || 8000, () =>
  console.log(`App is running on port ${8000}`)
);
