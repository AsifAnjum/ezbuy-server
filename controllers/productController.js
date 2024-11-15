const {
  uploader,
  uploadProductImg,
  deleteImgFromFirebase,
} = require("../middleware/uploader");

const Review = require("../models/Review");

const {
  createProductService,
  getAllProductsService,
  getProductByIdService,
  updateProductService,
  getProductsBySellerService,
} = require("../services/productService");
const { user } = require("../utils/constants");
const {
  customSlug,
  restrictField,
  response,
  isObjEmpty,
} = require("../utils/helperFunctions");

exports.addProduct = async (req, res, next) => {
  try {
    if (isObjEmpty(req.body) || !req.files) {
      return response(res, 400, false, "No data found!!!");
    }

    const filterFieldArray = [
      "sold",
      "review",
      "views",
      "slug",
      "imgUrls",
      "averageRatting",
    ];
    const isFieldExist = restrictField(filterFieldArray, req.body);

    if (isFieldExist) {
      return response(
        res,
        400,
        false,
        "Can't modify these field own your own",
        null,
        { restrictField: filterFieldArray }
      );
    }

    const { id: creatorId } = req.user;

    const result = await createProductService({
      ...req.body,
      createdBy: creatorId,
    });

    const slug = customSlug(req.body.title, result._id);

    let imgUrls = [];

    if (req.files) {
      imgUrls = await uploadProductImg(req, res, result._id);
    }

    result.slug = slug;
    result.imgUrls = imgUrls;
    await result.save();

    response(res, 201, true, "successfully created", null, result);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.fetchAllProducts = async (req, res) => {
  try {
    let filters = { ...req.query };

    //sort,page,limit ---> exclude
    const excludeFields = [
      "sort",
      "page",
      "limit",
      "fields",
      "rating",
      "search",
      "ids",
    ];
    excludeFields.forEach((field) => delete filters[field]);

    // //gt,lt,gte,lte
    // let filterString = JSON.stringify(filters);
    // filterString = filterString.replace(
    //   /\b(eq|gt|gte|lt|lte)\b/g,
    //   (match) => `$${match}`
    // );

    // filters = JSON.parse(filterString);

    const queries = {};

    if (req.query.search) {
      const searchQuery = req.query.search;

      filters = {
        ...filters,
        $or: [
          { title: new RegExp(searchQuery, "i") }, // Case-insensitive search in title
          { tags: new RegExp("^" + searchQuery + "$", "i") }, // exact word match  & Case-insensitive search in tags array
        ],
      };
    }

    if (req.query.ids) {
      const ids = req.query.ids.split(",").slice(0, 10);

      filters._id = { $in: ids };
    }

    if (req.query.category) {
      const category = req.query.category.split(",");
      filters.category = { $in: category };
    }

    if (req.query.tags) {
      const tags = req.query.tags.split(",");
      filters.tags = { $in: tags };
    }

    if (req.query.rating) {
      filters = {
        ...filters,
        "averageRating.rating": { $gte: parseInt(req.query.rating) },
      };
    }

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");

      queries.sortBy = sortBy;
    }

    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      queries.fields = fields;
    }

    const { page = 1, limit = 12 } = req.query;

    const skip = (page - 1) * parseInt(limit);
    queries.skip = skip;
    queries.limit = parseInt(limit);

    const products = await getAllProductsService(filters, queries);

    response(res, 200, true, null, null, products);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.fetchOfferProducts = async (req, res) => {
  try {
    const query = {
      sortBy: "-sale",
      limit: 8,
      fields: "title slug imgUrls SalePrice sale price stock averageRating",
    };
    const products = await getAllProductsService({}, query);
    throw new Error("Error while fetching offer products");
    response(res, 200, true, null, null, products);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.fetchBestSellingProducts = async (req, res) => {
  try {
    const query = {
      sortBy: "-sold",
      limit: 5,
      fields: "title slug imgUrls SalePrice sale price stock averageRating",
    };

    const products = await getAllProductsService({}, query);
    response(res, 200, true, null, null, products);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.fetchProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await getProductByIdService(id);

    if (!product) {
      return response(res, 404, false, "No Product Found!!");
    }

    //browser only
    const viewedProducts = req.cookies?.viewedProducts || [];

    if (!viewedProducts.includes(id)) {
      product.views += 1;
      viewedProducts.push(id);

      res.cookie("viewedProducts", viewedProducts, {
        maxAge: 172800000, //48 hours, 86400000 == 24 hours, 300000 === 5 mints
      });
      await product.save();
    }

    response(res, 200, true, null, null, product);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id: prodId } = req.params;
    const { id: userId } = req.user;

    if (isObjEmpty(req.body)) {
      return response(res, 400, false, "No Data Send");
    }

    const filterFieldArray = [
      "slug",
      "review",
      "sold",
      "sellerInfo",
      "_id",
      "views",
      "imgUrls",
      "SalePrice",
    ];

    const isFieldExist = restrictField(filterFieldArray, req.body);
    if (isFieldExist) {
      return response(res, 400, false, "Can't modify these field", null, {
        restrictField: filterFieldArray,
      });
    }

    const product = await getProductByIdService(prodId);

    if (!product) {
      return response(res, 404, false, "No Product Found!!");
    }

    // if (product.sellerInfo.id.toString() !== userId) {
    //   return response(res, 400, false, "You are not authorized!!!");
    // }

    if ("title" in req.body) {
      const slug = customSlug(req.body.title, prodId);
      product.slug = slug;
    }

    if ("sale" in req.body) {
      const salePrice = parseFloat(
        (product.price - (product.price * req.body.sale) / 100).toFixed(2)
      );
      product.salePrice = salePrice;
    }

    for (const field in req.body) {
      product[field] = req.body[field];
    }

    await product.save();
    return response(res, 200, true, "successfully updated", null, product);
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.updateProductImage = async (req, res) => {
  const { id: prodId } = req.params;

  try {
    if (req.files) {
      const product = await getProductByIdService(prodId);
      if (!product) {
        return response(res, 404, false, "No Product Found!!");
      }

      const imgUrlsLength = req.files?.length + product.imgUrls.length;

      if (imgUrlsLength > 4) {
        return response(res, 400, false, "Maximum image:4");
      }

      const imgUrls = await uploadProductImg(req, res);

      const result = await product.updateOne({
        $push: { imgUrls: { $each: imgUrls } },
      });

      if (!result.acknowledged) {
        return response(res, 400, false, "Updated failed!!!");
      }
      return response(res, 200, true, "successfully updated", null, prodId);
    }

    response(res, 400, false, "No file found!!!");
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.deleteProductImg = async (req, res) => {
  try {
    const { id: prodId } = req.params;

    const urls = req.body;

    if (!prodId || !urls || !Array.isArray(urls)) {
      return response(res, 400, false, "No Data found!!!");
    }

    const product = await getProductByIdService(prodId);

    if (!product) {
      return response(res, 404, false, "No Product Found!!");
    }

    const result = await product.updateOne({
      $pull: { imgUrls: { $in: urls } },
    });

    if (!result.acknowledged) {
      return response(res, 400, false, "Operation failed!!!");
    }
    const deleteFromImgDb = await deleteImgFromFirebase(urls);

    return response(res, 200, true, "successfully deleted");
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.fetchSellerProducts = async (req, res) => {
  const { id } = req.user;
  try {
    const products = await getProductsBySellerService(id);
    return response(res, 200, true, null, null, products);
  } catch (error) {
    response(res, error.statusCode || 400, false, error.message, error);
  }
};

exports.addProductReview = async (req, res) => {
  const { id: userId, role: userRole } = req.user;
  const { id: prodId } = req.params;
  try {
    const { rating, comment } = req.body;

    if (!userId || !prodId || !rating) {
      return response(res, 400, false, "No Data found!!!");
    }

    if (userRole !== user) {
      return response(res, 400, false, "Only user can add review");
    }

    const product = await getProductByIdService(prodId);

    if (!product) {
      return response(res, 404, false, "No Product Found!!");
    }

    if (product.averageRating.userId.includes(userId)) {
      return response(res, 409, false, "You already rated this product");
    }

    const review = {
      user: userId,
      product: prodId,
      rating: rating || 0,
      comment: comment || "",
    };

    const postReview = await Review.create(review);

    // Update rating distribution
    product.ratingDistribution[rating] += 1;
    product.averageRating.userId.push(userId);

    // const totalRating = Object.keys(product.ratingDistribution).reduce(
    //   (acc, key) => {
    //     return acc + key * product.ratingDistribution[key];
    //   },
    //   0
    // );

    let totalRating = 0;

    for (const [key, value] of Object.entries(product.ratingDistribution)) {
      totalRating += key * value;
    }

    const avrgRating = Math.min(
      Math.round(totalRating / product.averageRating.userId.length),
      5
    );

    product.averageRating.rating = avrgRating;
    product.review.push(postReview._id);

    const productRes = await product.save();

    response(
      res,
      200,
      true,
      "Review added successfully",
      null,
      productRes.averageRating
    );
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};
