import { Button } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, HStack, Text } from "@chakra-ui/layout";
import {
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from "@chakra-ui/menu";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { useHistory } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useColorModeValue, useToast } from "@chakra-ui/react";
import ChatLoading from "../ChatLoading";
import { Spinner } from "@chakra-ui/spinner";
import ProfileModal from "./ProfileModal";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";
import ColorModeToggle from "../common/ColorModeToggle";
import EmptyState from "../common/EmptyState";
import { Search2Icon, ChatIcon } from "@chakra-ui/icons";
import { appToast } from "../../utils/toast";

function SideDrawer({ onOpenChatsDrawer }) {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
  } = ChatState();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const history = useHistory();
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [onOpen]);

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleSearch = async () => {
    if (!search) {
      toast({ ...appToast, title: "Please enter something in search", status: "warning" });
      return;
    }

    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/user?search=${search}`, config);
      setSearchResult(data);
    } catch (error) {
      toast({
        ...appToast,
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      onClose();
    } catch (error) {
      toast({ ...appToast, title: "Error fetching the chat", description: error.message, status: "error" });
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <>
      <Box
        d="flex"
        justifyContent="space-between"
        alignItems="center"
        bg={useColorModeValue("white", "gray.800")}
        w="100%"
        p="10px 14px"
        borderBottomWidth="1px"
        borderColor={useColorModeValue("gray.200", "whiteAlpha.200")}
        position="sticky"
        top={0}
        zIndex={5}
      >
        <HStack spacing={2}>
          <Tooltip label="Search users (Ctrl/Cmd + K)" hasArrow placement="bottom-end">
            <Button variant="ghost" onClick={onOpen} leftIcon={<Search2Icon />}>
              <Text d={{ base: "none", md: "flex" }}>Search</Text>
            </Button>
          </Tooltip>
          <Button d={{ base: "inline-flex", md: "none" }} variant="ghost" onClick={onOpenChatsDrawer} leftIcon={<ChatIcon />}>
            Chats
          </Button>
        </HStack>
        <Text fontSize="xl" fontWeight="bold">Talk-A-Tive</Text>
        <HStack spacing={1}>
          <ColorModeToggle />
          <Menu>
            <MenuButton p={1} aria-label="Open notifications">
              <NotificationBadge count={notification.length} effect={Effect.SCALE} />
              <BellIcon fontSize="2xl" m={1} />
            </MenuButton>
            <MenuList>
              {!notification.length && <MenuItem>No new messages</MenuItem>}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  {notif.chat.isGroupChat
                    ? `New Message in ${notif.chat.chatName}`
                    : `New Message from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton as={Button} variant="ghost" rightIcon={<ChevronDownIcon />} aria-label="Open profile menu">
              <Avatar size="sm" cursor="pointer" name={user.name} src={user.pic} />
            </MenuButton>
            <MenuList>
              <ProfileModal user={user}>
                <MenuItem>My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem onClick={logoutHandler}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">Search Users</DrawerHeader>
          <DrawerBody>
            <Box d="flex" pb={2}>
              <Input
                ref={searchInputRef}
                placeholder="Search by name or email"
                mr={2}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button onClick={handleSearch}>Go</Button>
            </Box>
            {loading ? (
              <ChatLoading variant="user-list" />
            ) : search && !searchResult?.length ? (
              <EmptyState icon={Search2Icon} title="No search results" hint="Try another name or email." />
            ) : (
              searchResult?.map((searchedUser) => (
                <UserListItem
                  key={searchedUser._id}
                  user={searchedUser}
                  handleFunction={() => accessChat(searchedUser._id)}
                />
              ))
            )}
            {loadingChat && <Spinner ml="auto" d="flex" mt={2} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;
