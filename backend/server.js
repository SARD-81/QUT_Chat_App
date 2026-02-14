const express = require("express");
const helmet = require("helmet");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cors = require("cors");
const { expressCorsOptions, socketCorsOptions } = require("./config/cors");
const Message = require("./models/messageModel");

dotenv.config();
connectDB();
const app = express();

// Baseline security headers (CSP defaults are enabled; extend policy if your SPA adds external sources).
app.use(helmet());
app.use(express.json()); // to accept json data
app.use(cors(expressCorsOptions));

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: socketCorsOptions,
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.userId = userData._id;
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved, acknowledgement) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    if (typeof acknowledgement === "function") {
      acknowledgement({
        status: "sent",
        messageId: newMessageRecieved._id,
      });
    }

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("message delivered", async ({ messageId, chatId }) => {
    if (!socket.userId || !messageId || !chatId) return;

    try {
      const message = await Message.findOneAndUpdate(
        { _id: messageId, chat: chatId },
        { $addToSet: { deliveredTo: socket.userId } },
        { new: true }
      )
        .select("_id sender chat")
        .populate("sender", "_id");

      if (!message || !message.sender?._id) return;

      io.to(message.sender._id.toString()).emit("message_delivered", {
        chatId,
        messageId,
        userId: socket.userId,
      });
    } catch (error) {
      console.error("Failed to update delivery state", error);
    }
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    if (socket.userId) {
      socket.leave(socket.userId);
    }
  });
});
