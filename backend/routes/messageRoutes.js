const express = require("express");
const {
  allMessages,
  sendMessage,
  markChatMessagesAsRead,
  reactToMessage,
  removeReaction,
  editMessage,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/chat/:chatId/read").post(protect, markChatMessagesAsRead);
router.route("/:messageId/react").post(protect, reactToMessage).delete(protect, removeReaction);
router.route("/:messageId").put(protect, editMessage).delete(protect, deleteMessage);
router.route("/:chatId").get(protect, allMessages);

module.exports = router;
