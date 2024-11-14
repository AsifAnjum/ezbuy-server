const express = require("express");
const messageController = require("../controllers/messageController");
const { verifyToken } = require("../middleware/verifyToken");
const authorization = require("../middleware/authorization");
const { admin, moderator } = require("../utils/constants");

const router = express.Router();

router
  .route("/")
  .post(messageController.sendMessage)
  .get(messageController.fetchMessages);

router
  .route("/:id")
  .get(
    verifyToken,
    authorization(admin, moderator),
    messageController.fetchMessage
  )
  .patch(
    verifyToken,
    authorization(admin, moderator),
    messageController.updateMessageStatus
  );

module.exports = router;
