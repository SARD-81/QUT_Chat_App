import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  IconButton,
  useDisclosure
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { ChatState } from "../Context/ChatProvider";
import OfflineBanner from "../components/OfflineBanner";
import AppShell from "../components/layout/AppShell";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user } = ChatState();
  const chatsDrawer = useDisclosure();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Box w="100%">
      {user && <SideDrawer onOpenChatsDrawer={chatsDrawer.onOpen} />}
      {user && isOffline && <OfflineBanner />}
      <AppShell maxW="7xl">
        <Box d={{ base: "flex", md: "none" }} justifyContent="flex-end" mb={2}>
          <IconButton
            aria-label="Open chats list"
            icon={<HamburgerIcon />}
            variant="outline"
            onClick={chatsDrawer.onOpen}
          />
        </Box>
        <Box d="flex" gap={3} w="100%" h={{ base: "78vh", md: "82vh" }}>
          {user && <MyChats fetchAgain={fetchAgain} />}
          {user && (
            <Chatbox
              fetchAgain={fetchAgain}
              setFetchAgain={setFetchAgain}
            />
          )}
        </Box>
      </AppShell>

      <Drawer isOpen={chatsDrawer.isOpen} placement="left" onClose={chatsDrawer.onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Chats</DrawerHeader>
          <DrawerBody>
            <MyChats fetchAgain={fetchAgain} isDrawer onSelectChat={chatsDrawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default Chatpage;
