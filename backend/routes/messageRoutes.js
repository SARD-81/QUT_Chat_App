const express = require("express");
const {
  allMessages,
  sendMessage,
  markChatMessagesAsRead,
  editMessage,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/chat/:chatId/read").post(protect, markChatMessagesAsRead);
router.route("/:messageId").put(protect, editMessage).delete(protect, deleteMessage);

module.exports = router;
