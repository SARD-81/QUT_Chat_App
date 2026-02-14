const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    originalContent: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    reactions: [
      {
        emoji: { type: String, required: true, trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
