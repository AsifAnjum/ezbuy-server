const {
  createMessageService,
  getMessagesService,
  getMessageService,
} = require("../services/messageService");
const { response, isObjEmpty } = require("../utils/helperFunctions");

exports.sendMessage = async (req, res) => {
  try {
    if (isObjEmpty(req.body)) {
      return response(res, 400, false, "No data found!!!");
    }

    const message = await createMessageService(req.body);
    response(res, 200, true, "Message sent", null, message);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.fetchMessages = async (req, res) => {
  try {
    let filters = {};
    const queries = {};

    if (req.query.search) {
      filters = {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
          { phone: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    if (req.query.sort) {
      queries.sortBy = req.query.sort;
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    queries.skip = skip;
    queries.limit = parseInt(limit);

    const messages = await getMessagesService(filters, queries);

    response(res, 200, true, "Messages fetched", null, messages);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.fetchMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return response(res, 400, false, "No Id found!!!");
    }
    const message = await getMessageService(id);

    if (!message) {
      return response(res, 404, false, "Message not found");
    }

    response(res, 200, true, "Message fetched", null, message);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};

exports.updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: userId, name, role } = req.user;

    if (!id) {
      return response(res, 400, false, "No Id found!!!");
    }

    const message = await getMessageService(id);

    if (!message) {
      return response(res, 404, false, "Message not found");
    }

    message.status = status;
    message.actionBy = { userId, name, role };

    await message.save();

    response(res, 200, true, "Message status updated", null, message);
  } catch (error) {
    response(res, 400, false, "something went wrong", error);
  }
};
