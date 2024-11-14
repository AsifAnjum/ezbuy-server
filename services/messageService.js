const Message = require("../models/Message");

exports.createMessageService = async (data) => {
  return await Message.create(data);
};

exports.getMessagesService = async (filters, queries) => {
  const result = await Message.aggregate([
    { $match: filters },
    {
      $facet: {
        total: [{ $count: "count" }],
        pending: [{ $match: { status: "pending" } }, { $count: "count" }],
        solved: [{ $match: { status: "solved" } }, { $count: "count" }],
        rejected: [{ $match: { status: "rejected" } }, { $count: "count" }],
        messages: [
          {
            $addFields: {
              sortOrder: {
                $cond: {
                  if: { $eq: ["$status", queries.sortBy] },
                  then: 1,
                  else: 2,
                },
              },
            },
          },
          { $sort: { sortOrder: 1 } },
          { $project: { sortOrder: 0 } },
          { $skip: queries.skip },
          { $limit: queries.limit },
        ],
      },
    },
  ]);

  const total = result[0].total[0] ? result[0].total[0].count : 0;
  const page = Math.ceil(total / queries.limit);
  const pending = result[0].pending[0] ? result[0].pending[0].count : 0;
  const solved = result[0].solved[0] ? result[0].solved[0].count : 0;
  const rejected = result[0].rejected[0] ? result[0].rejected[0].count : 0;
  const messages = result[0].messages;

  return { total, page, pending, solved, rejected, messages };
};

exports.getMessageService = async (id) => {
  return await Message.findById(id);
};
