const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } = require("./uploadControllers");

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
      .populate("chat")
    .populate({
      path: "replyTo",
      select: "content sender isDeleted",
      populate: { path: "sender", select: "name pic email" },
    });

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
  const { content, chatId, replyTo, attachment } = req.body;

  const trimmedContent = typeof content === "string" ? content.trim() : "";

  if (!chatId || (!trimmedContent && !attachment)) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  let validatedReplyTo = null;

  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(replyTo)) {
      res.status(400);
      throw new Error("Invalid replyTo message id");
    }

    const referencedMessage = await Message.findById(replyTo).select("_id chat content");

    if (!referencedMessage || referencedMessage.chat.toString() !== chatId.toString()) {
      res.status(400);
      throw new Error("Referenced reply message is invalid");
    }

    validatedReplyTo = referencedMessage._id;
  }

  let validatedAttachment = null;

  if (attachment) {
    const { url, fileName, mimeType, size, resourceType, publicId } = attachment;

    if (!url || !fileName || !mimeType || !size) {
      res.status(400);
      throw new Error("Attachment metadata is incomplete");
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      res.status(400);
      throw new Error("Attachment type is not allowed");
    }

    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > MAX_FILE_SIZE_BYTES) {
      res.status(400);
      throw new Error("Attachment exceeds size limit");
    }

    validatedAttachment = {
      url,
      fileName,
      mimeType,
      size: numericSize,
      resourceType: resourceType || "raw",
      publicId,
    };
  }

  var newMessage = {
    sender: req.user._id,
    content: trimmedContent,
    chat: chatId,
    deliveredTo: [],
    readBy: [req.user._id],
    replyTo: validatedReplyTo,
    attachment: validatedAttachment,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await message
      .populate({
        path: "replyTo",
        select: "content sender isDeleted",
        populate: { path: "sender", select: "name pic email" },
      })
      .execPopulate();
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    const io = req.app.get("io");

    if (message.replyTo) {
      emitMessageToChatRoom(io, message.chat._id, "message_replied", message);
    }

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




const emitMessageToChatRoom = (io, chatId, eventName, payload) => {
  if (!io || !chatId) return;

  io.to(chatId.toString()).emit(eventName, payload);
};


const validateMessageAccess = async (messageId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    const error = new Error("Invalid message id");
    error.statusCode = 400;
    throw error;
  }

  const message = await Message.findById(messageId).populate("chat", "users");

  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = (message.chat?.users || []).some(
    (chatUserId) => chatUserId.toString() === userId.toString()
  );

  if (!isParticipant) {
    const error = new Error("Not authorized to access this message");
    error.statusCode = 403;
    throw error;
  }

  return message;
};

const hydrateMessage = async (messageId) =>
  Message.findById(messageId)
    .populate("sender", "name pic email")
    .populate("chat")
    .populate({
      path: "replyTo",
      select: "content sender isDeleted",
      populate: { path: "sender", select: "name pic email" },
    });

//@description     React to message (toggle per emoji/user)
//@route           POST /api/Message/:messageId/react
//@access          Protected
const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const normalizedEmoji = typeof emoji === "string" ? emoji.trim() : "";

  if (!normalizedEmoji) {
    res.status(400);
    throw new Error("Emoji is required");
  }

  let message;

  try {
    message = await validateMessageAccess(messageId, req.user._id);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }

  const existingReactionIndex = (message.reactions || []).findIndex(
    (reaction) =>
      reaction.userId.toString() === req.user._id.toString() && reaction.emoji === normalizedEmoji
  );

  if (existingReactionIndex >= 0) {
    message.reactions.splice(existingReactionIndex, 1);
  } else {
    message.reactions.push({ emoji: normalizedEmoji, userId: req.user._id });
  }

  await message.save();

  const hydratedMessage = await hydrateMessage(message._id);
  const io = req.app.get("io");
  emitMessageToChatRoom(io, hydratedMessage.chat._id, "reaction_updated", hydratedMessage);

  res.json(hydratedMessage);
});

//@description     Remove reaction from message
//@route           DELETE /api/Message/:messageId/react
//@access          Protected
const removeReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const normalizedEmoji = typeof emoji === "string" ? emoji.trim() : "";

  if (!normalizedEmoji) {
    res.status(400);
    throw new Error("Emoji is required");
  }

  let message;

  try {
    message = await validateMessageAccess(messageId, req.user._id);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message);
  }

  message.reactions = (message.reactions || []).filter(
    (reaction) =>
      !(reaction.userId.toString() === req.user._id.toString() && reaction.emoji === normalizedEmoji)
  );

  await message.save();

  const hydratedMessage = await hydrateMessage(message._id);
  const io = req.app.get("io");
  emitMessageToChatRoom(io, hydratedMessage.chat._id, "reaction_updated", hydratedMessage);

  res.json(hydratedMessage);
});

//@description     Edit existing message content
//@route           PUT /api/Message/:messageId
//@access          Protected
const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    res.status(400);
    throw new Error("Invalid message id");
  }

  const trimmedContent = typeof content === "string" ? content.trim() : "";

  if (!trimmedContent) {
    res.status(400);
    throw new Error("Message content is required");
  }

  const message = await Message.findById(messageId).populate("chat", "users");

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to edit this message");
  }

  if (message.isDeleted) {
    res.status(400);
    throw new Error("Deleted messages cannot be edited");
  }

  if (message.content === trimmedContent) {
    return res.json(message);
  }

  if (!message.originalContent) {
    message.originalContent = message.content;
  }

  message.content = trimmedContent;
  message.editedAt = new Date();

  let updatedMessage = await message.save();
  updatedMessage = await updatedMessage.populate("sender", "name pic email");
  updatedMessage = await updatedMessage.populate("chat")
    .populate({
      path: "replyTo",
      select: "content sender isDeleted",
      populate: { path: "sender", select: "name pic email" },
    });

  await Chat.findByIdAndUpdate(updatedMessage.chat._id, { latestMessage: updatedMessage });

  const io = req.app.get("io");
  emitMessageToChatRoom(io, updatedMessage.chat._id, "message_updated", updatedMessage);

  res.json(updatedMessage);
});

//@description     Soft delete message
//@route           DELETE /api/Message/:messageId
//@access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    res.status(400);
    throw new Error("Invalid message id");
  }

  const message = await Message.findById(messageId).populate("chat", "users");

  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this message");
  }

  if (message.isDeleted) {
    return res.json(message);
  }

  if (!message.originalContent) {
    message.originalContent = message.content;
  }

  message.content = "This message was deleted";
  message.isDeleted = true;
  message.deletedAt = new Date();

  let deletedMessage = await message.save();
  deletedMessage = await deletedMessage.populate("sender", "name pic email");
  deletedMessage = await deletedMessage.populate("chat")
    .populate({
      path: "replyTo",
      select: "content sender isDeleted",
      populate: { path: "sender", select: "name pic email" },
    });

  await Chat.findByIdAndUpdate(deletedMessage.chat._id, { latestMessage: deletedMessage });

  const io = req.app.get("io");
  emitMessageToChatRoom(io, deletedMessage.chat._id, "message_deleted", {
    _id: deletedMessage._id,
    chatId: deletedMessage.chat._id,
    deletedAt: deletedMessage.deletedAt,
    isDeleted: deletedMessage.isDeleted,
    content: deletedMessage.content,
    sender: deletedMessage.sender,
  });

  res.json(deletedMessage);
});

module.exports = {
  allMessages,
  sendMessage,
  markChatMessagesAsRead,
  reactToMessage,
  removeReaction,
  editMessage,
  deleteMessage,
};
