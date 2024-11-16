const Product = require("../models/Product");
const user = require("../models/User");

exports.createProductService = async (data) => {
  const product = await Product.create(data);

  // const { _id: prodId, sellerInfo } = product;

  // const updateSellerInfo = await user.updateOne(
  //   { _id: sellerInfo.id },
  //   {
  //     $push: { "sellerInfo.products": prodId },
  //   }
  // );

  // if (updateSellerInfo.modifiedCount !== 1) {
  //   const deleteProduct = await Product.deleteOne({ _id: prodId });
  //   const error = new Error("Error while updating seller Info");
  //   error.statusCode = 400;
  //   throw error;
  // }

  return product;
};

exports.getAllProductsService = async (filters, queries) => {
  const products = await Product.find(filters)
    .skip(queries.skip)
    .limit(queries.limit)
    .select(queries.fields)
    .sort(queries.sortBy);

  const total = await Product.countDocuments(filters);
  const page = Math.ceil(total / queries.limit);

  return { total, page, products, limit: queries.limit };
};

exports.getProductByIdService = async (id) => {
  return await Product.findById(id);
};

exports.getProductStockByIdService = async (id) => {
  return await Product.findById(id).select("stock");
};

exports.updateProductService = async (productId, productData) => {
  return await Product.updateOne({ _id: productId }, productData, {
    runValidators: true,
  }); // data = {fieldName: value}
};

exports.bulkUpdateProductService = async (data) => {
  return await Product.bulkWrite(data);
};

exports.getProductsBySellerService = async (id) => {
  return await Product.find({ "sellerInfo.qid": id });
};
