const { initializeApp } = require("firebase/app");

const {
  ref,
  getStorage,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} = require("firebase/storage");
const multer = require("multer");
const path = require("path");

const { firebaseConfig } = require("../utils/firebaseConfig");

const { response } = require("../utils/helperFunctions");

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//get firebase storage
const storage = getStorage();

exports.uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const supportedImg = /png|jpg|jpeg|webp/;
    const extension = path.extname(file.originalname);
    if (supportedImg.test(extension)) {
      cb(null, true);
    } else {
      const error = new Error("Only JPEG,PNG and WEBP files are allowed");
      error.statusCode = 400;
      cb(error);
    }
  },
  limits: {
    fileSize: 5242880, // max img size 5 mb
  },
});

exports.uploadUserImg = async (req, res) => {
  try {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `${req.user.id}-${Date.now()}`;
    const storageRef = ref(storage, `user/img/${fileName}`);

    const metadata = {
      contentType: req.file.mimetype,
    };

    //upload img in firebase storage
    const snapshot = await uploadBytesResumable(
      storageRef,
      req.file.buffer,
      metadata
    );

    //get download url
    const getUrl = await getDownloadURL(snapshot.ref);

    return getUrl;
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};
exports.uploadProductImg = async (req, res, prodId) => {
  try {
    let imgUrls = [];

    const storageRef = ref(storage, "product/img/");

    const uploadedImages = req.files;

    if (uploadedImages?.length > 0) {
      for (const file of req?.files) {
        const uniqueSuffix =
          Date.now() + "-" + Math.round(Math.random() * 1000);
        const fileName = `${prodId}-${uniqueSuffix}`;

        const snapshot = await uploadBytesResumable(
          ref(storageRef, fileName),
          file.buffer,
          { contentType: file.mimetype }
        );

        const getUrl = await getDownloadURL(snapshot.ref);
        imgUrls.push(getUrl);
      }
      return imgUrls;
    }

    throw new Error("Something went wrong!!!");

    //get download url
  } catch (error) {
    response(res, 400, false, error.message, error);
  }
};

exports.deleteImgFromFirebase = async (urls) => {
  if (urls?.length) {
    for (const url of urls) {
      const httpsRef = ref(storage, url);
      try {
        await deleteObject(httpsRef);
      } catch (error) {
        switch (error.code) {
          case "storage/object-not-found":
            // File doesn't exist
            break;
          case "storage/unauthorized":
            error.message = "you are not authorized";
            error.statusCode = 403;
            break;

          case "storage/unknown":
            // Unknown error occurred, inspect the server response
            break;
        }
      }
    }
    return;
  }
  const error = new Error("Something went wrong");
  error.statusCode = 400;
  throw error;
};
