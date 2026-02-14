const express = require("express");
const {
  allMessages,
  sendMessage,
  markChatMessagesAsRead,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/chat/:chatId/read").post(protect, markChatMessagesAsRead);

module.exports = router;
