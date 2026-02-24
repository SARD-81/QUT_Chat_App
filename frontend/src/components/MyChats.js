import { AddIcon } from "@chakra-ui/icons";
import { Badge, Box, Button, HStack, Stack, Text, useColorModeValue, useToast } from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { cacheChats, loadCachedChats } from "../storage/chatCache";
import { appToast } from "../utils/toast";
import { apiErrorText } from "../utils/apiErrorText";

const MyChats = ({ fetchAgain, isDrawer = false, onSelectChat }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [loadingChats, setLoadingChats] = useState(true);
  const { selectedChat, setSelectedChat, user, chats, setChats, notification } = ChatState();
  const toast = useToast();
  const { t } = useTranslation(["chat", "message", "common", "errors"]);

  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get("/api/chat", config);
      setChats(data);
      cacheChats(data).catch(() => {});
    } catch (error) {
      if (!navigator.onLine) return;
      toast({
        ...appToast,
        title: t("common:errorOccurred"),
        description: apiErrorText(error, t) || t("chat:failedLoadChats"),
        status: "error",
      });
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    loadCachedChats().then((cachedChats) => {
      if (cachedChats.length) {
        setChats(cachedChats);
        setLoadingChats(false);
      }
    });
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const chatItemBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const selectedChatBg = useColorModeValue("brand.500", "brand.400");

  const getLatestMessagePreview = (latestMessage) => {
    if (!latestMessage) return "";
    if (latestMessage.isDeleted) return t("message:deleted");
    if (latestMessage.type === "gif") return `🎞️ ${t("message:gif")}`;
    if (latestMessage.content) return latestMessage.content;
    if (latestMessage.attachment) {
      return latestMessage.attachment.mimeType?.startsWith("image/")
        ? t("message:image")
        : t("message:attachment", { fileName: latestMessage.attachment.fileName || t("chat:file") });
    }
    return "";
  };

  return (
    <Box
      d={isDrawer ? "flex" : { base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      p={3}
      bg={useColorModeValue("white", "gray.800")}
      w={isDrawer ? "100%" : { base: "100%", md: "32%" }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={useColorModeValue("gray.200", "whiteAlpha.200")}
      shadow="sm"
      h="100%"
    >
      <HStack pb={3} px={1} justifyContent="space-between" alignItems="center">
        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold">{t("chat:myChats")}</Text>
        <GroupChatModal>
          <Button size="sm" rightIcon={<AddIcon />} variant="outline">{t("chat:newGroup")}</Button>
        </GroupChatModal>
      </HStack>
      <Box p={2} bg={useColorModeValue("gray.50", "blackAlpha.300")} w="100%" h="100%" borderRadius="md" overflowY="auto">
        {loadingChats ? (
          <ChatLoading variant="chat-list" />
        ) : (
          <Stack spacing={2}>
            {chats?.map((chat) => {
              const unreadCount = notification.filter((n) => n.chat._id === chat._id).length;
              return (
                <Box
                  key={chat._id}
                  onClick={() => {
                    setSelectedChat(chat);
                    onSelectChat?.();
                  }}
                  cursor="pointer"
                  bg={selectedChat === chat ? selectedChatBg : chatItemBg}
                  color={selectedChat === chat ? "white" : undefined}
                  px={3}
                  py={2.5}
                  borderRadius="md"
                  transition="all 0.2s ease"
                  _hover={{ transform: "translateY(-1px)", shadow: "md" }}
                >
                  <HStack justify="space-between" align="start">
                    <Text fontWeight="semibold" noOfLines={1}>
                      {!chat.isGroupChat ? getSender(loggedUser, chat.users) : chat.chatName}
                    </Text>
                    {unreadCount > 0 && <Badge colorScheme="red">{unreadCount}</Badge>}
                  </HStack>
                  {chat.latestMessage && (
                    <Text fontSize="xs" mt={1} opacity={0.85} noOfLines={1}>
                      <b>{chat.latestMessage.sender.name}: </b>
                      {getLatestMessagePreview(chat.latestMessage)}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
