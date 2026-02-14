import { AddIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Button } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();

  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const toast = useToast();

  const fetchChats = async () => {
    // console.log(user._id);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const getLatestMessagePreview = (latestMessage) => {
    if (!latestMessage) return "";
    if (latestMessage.isDeleted) return "This message was deleted";
    if (latestMessage.type === "gif") return "🎞️ GIF";
    if (latestMessage.content) return latestMessage.content;
    if (latestMessage.attachment) {
      return latestMessage.attachment.mimeType?.startsWith("image/")
        ? "📷 Image"
        : `📎 ${latestMessage.attachment.fileName || "Attachment"}`;
    }
    return "";
  };

  const getLatestMessageReceiptLabel = (chat) => {
    if (!chat?.latestMessage || !loggedUser) return "";

    const isOutgoing =
      chat.latestMessage.sender?._id?.toString() === loggedUser._id?.toString();

    if (!isOutgoing) return "";

    const readByCount = (chat.latestMessage.readBy || []).length;

    if (readByCount === 0) return "sent";
    if (readByCount === 1) return "delivered";

    if (!chat.isGroupChat) return "seen";

    const seenByOthers = Math.max(readByCount - 1, 0);
    return `seen by ${seenByOthers}`;
  };

  return (
    <Box
      d={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={3}
      bg="white"
      w={{ base: "100%", md: "31%" }}
      borderRadius="lg"
      borderWidth="1px"
    >
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "28px", md: "30px" }}
        fontFamily="Work sans"
        d="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
      >
        My Chats
        <GroupChatModal>
          <Button
            d="flex"
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
          >
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      <Box
        d="flex"
        flexDir="column"
        p={3}
        bg="#F8F8F8"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <Stack overflowY="scroll">
            {chats.map((chat) => (
              <Box
                onClick={() => setSelectedChat(chat)}
                cursor="pointer"
                bg={selectedChat === chat ? "#38B2AC" : "#E8E8E8"}
                color={selectedChat === chat ? "white" : "black"}
                px={3}
                py={2}
                borderRadius="lg"
                key={chat._id}
              >
                <Text>
                  {!chat.isGroupChat
                    ? getSender(loggedUser, chat.users)
                    : chat.chatName}
                </Text>
                {chat.latestMessage && (
                  <Text fontSize="xs">
                    <b>{chat.latestMessage.sender.name} : </b>
                    {getLatestMessagePreview(chat.latestMessage).length > 50
                      ? getLatestMessagePreview(chat.latestMessage).substring(0, 51) + "..."
                      : getLatestMessagePreview(chat.latestMessage)}
                    {chat.latestMessage.editedAt && !chat.latestMessage.isDeleted
                      ? " (edited)"
                      : ""}
                    {getLatestMessageReceiptLabel(chat)
                      ? ` • ${getLatestMessageReceiptLabel(chat)}`
                      : ""}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
