import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast, HStack, Button, useColorModeValue } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { ArrowBackIcon, AttachmentIcon, CloseIcon, ChatIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "lottie-react";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { uploadFileToCloudinary, validateAttachmentFile } from "../config/uploadConfig";
import GifPicker from "./GifPicker";
import { cacheMessages, loadCachedMessages } from "../storage/chatCache";
import ChatLoading from "./ChatLoading";
import EmptyState from "./common/EmptyState";
import { appToast } from "../utils/toast";
import { apiErrorText } from "../utils/apiErrorText";
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
  const { t } = useTranslation(["chat", "common", "message", "errors"]);

  const panelSurfaceBg = useColorModeValue("gray.50", "blackAlpha.300");
  const panelBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const chatHeaderBg = useColorModeValue("white", "gray.800");
  const messageInputBg = useColorModeValue("white", "whiteAlpha.200");

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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedLoadMessages"),
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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedLoadOlderMessages"),
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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedReaction"),
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
    const nextContent = window.prompt(t("chat:editMessagePrompt"), message.content);

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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedEditMessage"),
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleDeleteMessage = async (message) => {
    const confirmed = window.confirm(t("chat:deleteMessageConfirm"));

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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedDeleteMessage"),
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
        ...appToast,
        title: t("common:errorOccurred"),
        description: t("chat:failedSendMessage"),
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
        ...appToast,
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
        ...appToast,
        title: t("chat:attachmentUploadFailed"),
        description: apiErrorText(error, t),
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

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key === "Escape") setReplyingTo(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

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
            fontSize={{ base: "24px", md: "28px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
            position="sticky"
            top={0}
            bg={chatHeaderBg}
            zIndex={2}
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
            bg={panelSurfaceBg}
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
            borderWidth="1px"
            borderColor={panelBorderColor}
          >
            {loading ? (
              <ChatLoading variant="messages" count={8} />
            ) : (
              <div
                className="messages"
                ref={chatContainerRef}
                onScroll={handleChatScroll}
              >
                {loadingOlder && (
                  <Spinner size="sm" alignSelf="center" mb={2} mt={1} />
                )}
                {messages.length ? (
                  <ScrollableChat
                    messages={messages}
                    latestOutgoingMessage={latestOutgoingMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onReact={handleReactToMessage}
                    onReply={handleReplyMessage}
                    replyingToMessageId={replyingTo?._id}
                  />
                ) : (
                  <EmptyState icon={ChatIcon} title={t("chat:noMessagesYet")} hint={t("chat:startConversation")} />
                )}
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
                    animationData={animationData}
                    loop
                    style={{ width: 70, marginBottom: 15, marginLeft: 0 }}
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
                        {t("chat:replyingTo", { name: replyingTo.sender?.name || t("chat:replyFallback") })}
                      </Text>
                      <Text fontSize="sm" color="gray.700" noOfLines={2}>
                        {replyingTo.isDeleted ? t("message:deleted") : replyingTo.content}
                      </Text>
                    </Box>
                    <Button size="xs" onClick={() => setReplyingTo(null)}>{t("common:cancel")}</Button>
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
                    {t("chat:attached", { fileName: pendingAttachment.fileName })}
                  </Text>
                  <IconButton
                    aria-label={t("chat:removeAttachment")}
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
                  aria-label={t("chat:attachFile")}
                  icon={<AttachmentIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={attachmentUploading}
                />
                <Input
                  variant="filled"
                  bg={messageInputBg}
                  placeholder={t("chat:enterMessage")}
                  value={newMessage}
                  onChange={typingHandler}
                />
                <Button
                  colorScheme="blue"
                  onClick={sendCurrentMessage}
                  isDisabled={!newMessage.trim() && !pendingAttachment}
                  isLoading={attachmentUploading}
                >{t("chat:send")}</Button>
              </HStack>
            </FormControl>
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%" w="100%">
          <EmptyState icon={ChatIcon} title={t("chat:selectChat")} hint={t("chat:chooseConversation")} />
        </Box>
      )}
    </>
  );
};

export default SingleChat;
