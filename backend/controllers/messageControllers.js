const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const parseLimit = (limitValue) => {
  const parsedLimit = Number.parseInt(limitValue, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
};

const buildBeforeFilter = (beforeValue) => {
  if (!beforeValue) return null;

  if (mongoose.Types.ObjectId.isValid(beforeValue)) {
    return { _id: { $lt: new mongoose.Types.ObjectId(beforeValue) } };
  }

  const parsedDate = new Date(beforeValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return { createdAt: { $lt: parsedDate } };
};

//@description     Get paginated Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const beforeFilter = buildBeforeFilter(req.query.before);

    if (req.query.before && !beforeFilter) {
      res.status(400);
      throw new Error("Invalid before query param. Use ISO date or message id.");
    }

    const query = { chat: req.params.chatId };

    if (beforeFilter) {
      Object.assign(query, beforeFilter);
    }

    const messagesDesc = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("sender", "name pic email")
      .populate("chat");

    const hasMore = messagesDesc.length > limit;
    const pageMessagesDesc = hasMore ? messagesDesc.slice(0, limit) : messagesDesc;
    const messages = pageMessagesDesc.reverse();

    res.json({
      messages,
      hasMore,
      nextBefore: messages.length ? messages[0]._id : null,
    });
  } catch (error) {
    res.status(res.statusCode === 200 ? 400 : res.statusCode);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    readBy: [req.user._id],
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Mark chat messages as read by current user
//@route           POST /api/Message/chat/:chatId/read
//@access          Protected
const markChatMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    res.status(400);
    throw new Error("Invalid chat id");
  }

  const chat = await Chat.findById(chatId).select("users latestMessage");

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isParticipant = chat.users.some(
    (chatUserId) => chatUserId.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    res.status(403);
    throw new Error("Not authorized to access this chat");
  }

  const updatedMessages = await Message.find({
    chat: chatId,
    readBy: { $ne: req.user._id },
  }).select("_id");

  if (!updatedMessages.length) {
    return res.json({ updatedCount: 0, messageIds: [] });
  }

  const updatedMessageIds = updatedMessages.map((message) => message._id);

  await Message.updateMany(
    { _id: { $in: updatedMessageIds } },
    { $addToSet: { readBy: req.user._id } }
  );

  const io = req.app.get("io");

  if (io) {
    chat.users.forEach((chatUserId) => {
      if (chatUserId.toString() === req.user._id.toString()) return;

      updatedMessageIds.forEach((messageId) => {
        io.to(chatUserId.toString()).emit("message_read", {
          chatId,
          messageId,
          userId: req.user._id.toString(),
        });
      });
    });
  }

  res.json({
    updatedCount: updatedMessageIds.length,
    messageIds: updatedMessageIds,
  });
});

module.exports = { allMessages, sendMessage, markChatMessagesAsRead };
