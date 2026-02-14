import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast, HStack, Button } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ArrowBackIcon, AttachmentIcon, CloseIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { uploadFileToCloudinary, validateAttachmentFile } from "../config/uploadConfig";
import GifPicker from "./GifPicker";
import { cacheMessages, loadCachedMessages } from "../storage/chatCache";
const ENDPOINT = "http://localhost:5000"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const PAGE_SIZE = 30;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
    setChats,
  } = ChatState();

  const scrollToBottom = () => {
    const container = chatContainerRef.current;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
  };

  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    const selectedChatId = selectedChat._id;

    loadCachedMessages(selectedChatId)
      .then((cachedMessages) => {
        if (!cachedMessages.length) return;
        setMessages(cachedMessages);
        shouldScrollToBottomRef.current = true;
      })
      .catch(() => {});

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        params: {
          limit: PAGE_SIZE,
        },
      };

      setLoading(true);

      const { data } = await axios.get(`/api/message/${selectedChatId}`, config);

      if (selectedChatCompare?._id && selectedChatCompare._id !== selectedChatId) {
        setLoading(false);
        return;
      }

      setMessages(data.messages || []);
      setHasMoreMessages(Boolean(data.hasMore));
      setOldestMessageId(data.nextBefore);
      shouldScrollToBottomRef.current = true;
      setLoading(false);

      cacheMessages(selectedChatId, data.messages || []).catch(() => {});

      socket.emit("join chat", selectedChatId);
    } catch (error) {
      setLoading(false);
      if (!navigator.onLine) return;

      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  }, [selectedChat, user.token, toast]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedChat || !hasMoreMessages || !oldestMessageId || loadingOlder) return;

    const container = chatContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;

    try {
      setLoadingOlder(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        params: {
          limit: PAGE_SIZE,
          before: oldestMessageId,
        },
      };

      const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);

      setMessages((prevMessages) => [...(data.messages || []), ...prevMessages]);
      setHasMoreMessages(Boolean(data.hasMore));
      setOldestMessageId(data.nextBefore);

      requestAnimationFrame(() => {
        if (!container) return;

        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - previousScrollHeight + container.scrollTop;
      });
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load older Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedChat, hasMoreMessages, oldestMessageId, loadingOlder, user.token, toast]);


  const markChatAsRead = useCallback(async () => {
    if (!selectedChat || !messages.length) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        `/api/message/chat/${selectedChat._id}/read`,
        {},
        config
      );

      if (!data?.messageIds?.length) return;

      const readMessageSet = new Set(data.messageIds.map((messageId) => messageId.toString()));

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (!readMessageSet.has(message._id.toString())) return message;

          const alreadyRead = (message.readBy || []).some(
            (readUserId) => readUserId.toString() === user._id.toString()
          );

          if (alreadyRead) return message;

          return {
            ...message,
            readBy: [...(message.readBy || []), user._id],
          };
        })
      );
    } catch (error) {
      // Silent fail: read receipts should not block chat usage
    }
  }, [selectedChat, messages.length, user.token, user._id]);

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
  };

  const handleReactToMessage = async (message, emoji) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const hasCurrentReaction = (message.reactions || []).some(
        (reaction) =>
          reaction.userId?.toString() === user._id.toString() && reaction.emoji === emoji
      );

      const endpoint = `/api/message/${message._id}/react`;
      const request = hasCurrentReaction
        ? axios.delete(endpoint, { ...config, data: { emoji } })
        : axios.post(endpoint, { emoji }, config);

      const { data } = await request;
      updateMessageInState(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to update reaction",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const updateMessageInState = useCallback((updatedMessage) => {
    if (!updatedMessage?._id) return;

    setMessages((prevMessages) =>
      prevMessages.map((message) =>
        message._id === updatedMessage._id ? { ...message, ...updatedMessage } : message
      )
    );

    if (!setChats || !selectedChatCompare) return;

    setChats((prevChats) =>
      (prevChats || []).map((chat) => {
        if (chat._id !== selectedChatCompare._id || !chat.latestMessage) return chat;
        if (chat.latestMessage._id !== updatedMessage._id) return chat;

        return {
          ...chat,
          latestMessage: { ...chat.latestMessage, ...updatedMessage },
        };
      })
    );
  }, [setChats]);

  const handleEditMessage = async (message) => {
    const nextContent = window.prompt("Edit message", message.content);

    if (nextContent === null) return;

    const trimmed = nextContent.trim();

    if (!trimmed || trimmed === message.content) return;

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put(`/api/message/${message._id}`, { content: trimmed }, config);
      updateMessageInState(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to edit the message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleDeleteMessage = async (message) => {
    const confirmed = window.confirm("Delete this message?");

    if (!confirmed) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.delete(`/api/message/${message._id}`, config);
      updateMessageInState(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to delete the message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendCurrentMessage = async ({ contentOverride, type = "text" } = {}) => {
    const rawContent = typeof contentOverride === "string" ? contentOverride : newMessage;
    const trimmedMessage = rawContent.trim();
    if (!selectedChat || (!trimmedMessage && !pendingAttachment) || attachmentUploading) return;

    socket.emit("stop typing", selectedChat._id);

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      setNewMessage("");
      const attachmentToSend = pendingAttachment;
      setPendingAttachment(null);

      const { data } = await axios.post(
        "/api/message",
        {
          content: trimmedMessage,
          chatId: selectedChat,
          type,
          replyTo: replyingTo?._id || undefined,
          attachment: attachmentToSend || undefined,
        },
        config
      );

      const pendingMessage = { ...data, socketStatus: "sending" };

      socket.emit("new message", pendingMessage, ({ status, messageId } = {}) => {
        if (status !== "sent" || !messageId) return;

        setMessages((prevMessages) =>
          prevMessages.map((message) =>
            message._id === messageId ? { ...message, socketStatus: "sent" } : message
          )
        );
      });

      setMessages((prevMessages) => [...prevMessages, pendingMessage]);
      setReplyingTo(null);
      shouldScrollToBottomRef.current = true;
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to send the Message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await sendCurrentMessage();
    }
  };

  const handleGifSelection = async (gif) => {
    await sendCurrentMessage({ contentOverride: gif.url, type: "gif" });
  };

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      toast({
        title: validationError,
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setAttachmentUploading(true);
      const uploadedAttachment = await uploadFileToCloudinary(file, "attachment");
      setPendingAttachment(uploadedAttachment);
    } catch (error) {
      toast({
        title: "Attachment upload failed",
        description: error.response?.data?.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setAttachmentUploading(false);
    }
  };


  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();
    setReplyingTo(null);

    selectedChatCompare = selectedChat;
  }, [selectedChat, fetchMessages]);

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      scrollToBottom();
      shouldScrollToBottomRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    markChatAsRead();
  }, [markChatAsRead]);

  useEffect(() => {
    const onMessageDelivered = ({ chatId, messageId, userId }) => {
      if (!selectedChatCompare || selectedChatCompare._id !== chatId) return;

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message._id !== messageId) return message;

          const alreadyDelivered = (message.deliveredTo || []).some(
            (deliveredUserId) => deliveredUserId.toString() === userId.toString()
          );

          if (alreadyDelivered) return message;

          return {
            ...message,
            deliveredTo: [...(message.deliveredTo || []), userId],
          };
        })
      );

      if (!setChats) return;

      setChats((prevChats) =>
        (prevChats || []).map((chat) => {
          if (!chat.latestMessage || chat.latestMessage._id !== messageId) return chat;

          const alreadyDelivered = (chat.latestMessage.deliveredTo || []).some(
            (deliveredUserId) => deliveredUserId.toString() === userId.toString()
          );

          if (alreadyDelivered) return chat;

          return {
            ...chat,
            latestMessage: {
              ...chat.latestMessage,
              deliveredTo: [...(chat.latestMessage.deliveredTo || []), userId],
            },
          };
        })
      );
    };

    socket.on("message_delivered", onMessageDelivered);

    return () => {
      socket.off("message_delivered", onMessageDelivered);
    };
  }, [setChats]);

  useEffect(() => {
    const onMessageRead = ({ chatId, messageId, userId }) => {
      if (!selectedChatCompare || selectedChatCompare._id !== chatId) return;

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message._id !== messageId) return message;

          const alreadyRead = (message.readBy || []).some(
            (readUserId) => readUserId.toString() === userId.toString()
          );

          if (alreadyRead) return message;

          return {
            ...message,
            readBy: [...(message.readBy || []), userId],
          };
        })
      );

      if (!setChats) return;

      setChats((prevChats) =>
        (prevChats || []).map((chat) => {
          if (!chat.latestMessage || chat.latestMessage._id !== messageId) return chat;

          const alreadyRead = (chat.latestMessage.readBy || []).some(
            (readUserId) => readUserId.toString() === userId.toString()
          );

          if (alreadyRead) return chat;

          return {
            ...chat,
            latestMessage: {
              ...chat.latestMessage,
              readBy: [...(chat.latestMessage.readBy || []), userId],
            },
          };
        })
      );
    };

    socket.on("message_read", onMessageRead);

    return () => {
      socket.off("message_read", onMessageRead);
    };
  }, [setChats]);

  useEffect(() => {
    const onMessageUpdated = (updatedMessage) => {
      const chatId =
        typeof updatedMessage.chat === "string"
          ? updatedMessage.chat
          : updatedMessage.chat?._id;

      if (!selectedChatCompare || selectedChatCompare._id !== chatId?.toString()) return;

      updateMessageInState(updatedMessage);
    };

    const onMessageDeleted = (deletedMessage) => {
      if (!selectedChatCompare || selectedChatCompare._id !== deletedMessage.chatId?.toString()) return;

      updateMessageInState({
        _id: deletedMessage._id,
        content: deletedMessage.content,
        isDeleted: deletedMessage.isDeleted,
        deletedAt: deletedMessage.deletedAt,
      });
    };

    const onReactionUpdated = (updatedMessage) => {
      const chatId =
        typeof updatedMessage.chat === "string"
          ? updatedMessage.chat
          : updatedMessage.chat?._id;

      if (!selectedChatCompare || selectedChatCompare._id !== chatId?.toString()) return;

      updateMessageInState(updatedMessage);
    };

    const onMessageReplied = (repliedMessage) => {
      const chatId =
        typeof repliedMessage.chat === "string"
          ? repliedMessage.chat
          : repliedMessage.chat?._id;

      if (!selectedChatCompare || selectedChatCompare._id !== chatId?.toString()) return;

      setMessages((prevMessages) => {
        if (prevMessages.some((message) => message._id === repliedMessage._id)) {
          return prevMessages;
        }

        return [...prevMessages, repliedMessage];
      });
    };

    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("reaction_updated", onReactionUpdated);
    socket.on("message_replied", onMessageReplied);

    return () => {
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("reaction_updated", onReactionUpdated);
      socket.off("message_replied", onMessageReplied);
    };
  }, [updateMessageInState]);

  useEffect(() => {
    const onMessageReceived = (newMessageRecieved) => {
      socket.emit("message delivered", {
        messageId: newMessageRecieved._id,
        chatId: newMessageRecieved.chat._id,
      });

      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prevMessages) => [...prevMessages, newMessageRecieved]);
        shouldScrollToBottomRef.current = true;
      }
    };

    socket.on("message recieved", onMessageReceived);

    return () => {
      socket.off("message recieved", onMessageReceived);
    };
  }, [notification, setNotification, setFetchAgain, fetchAgain]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const handleChatScroll = (event) => {
    if (event.currentTarget.scrollTop <= 40) {
      loadOlderMessages();
    }
  };

  const latestOutgoingMessage = useMemo(() => {
    if (!messages.length || !selectedChat) return null;

    const ownMessages = messages.filter(
      (message) => message.sender?._id?.toString() === user._id.toString()
    );

    if (!ownMessages.length) return null;

    return ownMessages[ownMessages.length - 1];
  }, [messages, selectedChat, user._id]);

  useEffect(() => {
    if (!selectedChat?._id) return;
    cacheMessages(selectedChat._id, messages).catch(() => {});
  }, [messages, selectedChat]);

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div
                className="messages"
                ref={chatContainerRef}
                onScroll={handleChatScroll}
              >
                {loadingOlder && (
                  <Spinner size="sm" alignSelf="center" mb={2} mt={1} />
                )}
                <ScrollableChat
                  messages={messages}
                  latestOutgoingMessage={latestOutgoingMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onReact={handleReactToMessage}
                  onReply={handleReplyMessage}
                  replyingToMessageId={replyingTo?._id}
                />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              {replyingTo && (
                <Box
                  mb={2}
                  p={2}
                  borderRadius="md"
                  bg="blue.50"
                  borderLeft="4px solid"
                  borderLeftColor="blue.400"
                >
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                        Replying to {replyingTo.sender?.name || "message"}
                      </Text>
                      <Text fontSize="sm" color="gray.700" noOfLines={2}>
                        {replyingTo.isDeleted ? "This message was deleted" : replyingTo.content}
                      </Text>
                    </Box>
                    <Button size="xs" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </HStack>
                </Box>
              )}
              {pendingAttachment && (
                <HStack
                  mb={2}
                  p={2}
                  borderRadius="md"
                  bg="green.50"
                  justifyContent="space-between"
                >
                  <Text fontSize="sm" noOfLines={1}>
                    Attached: {pendingAttachment.fileName}
                  </Text>
                  <IconButton
                    aria-label="Remove attachment"
                    size="xs"
                    icon={<CloseIcon />}
                    onClick={() => setPendingAttachment(null)}
                  />
                </HStack>
              )}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={handleFileSelection}
              />
              <HStack>
                <GifPicker
                  onSelectGif={handleGifSelection}
                  isDisabled={!selectedChat || attachmentUploading}
                />
                <IconButton
                  aria-label="Attach file"
                  icon={<AttachmentIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={attachmentUploading}
                />
                <Input
                  variant="filled"
                  bg="#E0E0E0"
                  placeholder="Enter a message.."
                  value={newMessage}
                  onChange={typingHandler}
                />
                <Button
                  colorScheme="blue"
                  onClick={sendCurrentMessage}
                  isDisabled={!newMessage.trim() && !pendingAttachment}
                  isLoading={attachmentUploading}
                >
                  Send
                </Button>
              </HStack>
            </FormControl>
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
