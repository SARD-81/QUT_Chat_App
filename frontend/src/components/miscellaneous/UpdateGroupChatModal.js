import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, useDisclosure, FormControl, Input, useToast, Box, IconButton, Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { apiErrorText } from "../../utils/apiErrorText";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameloading, setRenameLoading] = useState(false);
  const toast = useToast();
  const { t } = useTranslation(["chat", "common", "errors"]);
  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/user?search=${query}`, config);
      setSearchResult(data);
    } catch (error) {
      toast({ title: t("common:errorOccurred"), description: apiErrorText(error, t) || t("chat:failedSearchResults"), status: "error", duration: 5000, isClosable: true, position: "bottom-left" });
    } finally { setLoading(false); }
  };

  const handleRename = async () => {
    if (!groupChatName) return;
    try {
      setRenameLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`/api/chat/rename`, { chatId: selectedChat._id, chatName: groupChatName }, config);
      setSelectedChat(data); setFetchAgain(!fetchAgain); setRenameLoading(false);
    } catch (error) {
      toast({ title: t("common:errorOccurred"), description: apiErrorText(error, t), status: "error", duration: 5000, isClosable: true, position: "bottom" });
      setRenameLoading(false);
    }
    setGroupChatName("");
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.find((u) => u._id === user1._id)) return toast({ title: t("chat:userAlreadyInGroup"), status: "error", duration: 5000, isClosable: true, position: "bottom" });
    if (selectedChat.groupAdmin._id !== user._id) return toast({ title: t("chat:onlyAdminsAdd"), status: "error", duration: 5000, isClosable: true, position: "bottom" });
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`/api/chat/groupadd`, { chatId: selectedChat._id, userId: user1._id }, config);
      setSelectedChat(data); setFetchAgain(!fetchAgain); setLoading(false);
    } catch (error) {
      toast({ title: t("common:errorOccurred"), description: apiErrorText(error, t), status: "error", duration: 5000, isClosable: true, position: "bottom" });
      setLoading(false);
    }
    setGroupChatName("");
  };

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) return toast({ title: t("chat:onlyAdminsRemove"), status: "error", duration: 5000, isClosable: true, position: "bottom" });
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.put(`/api/chat/groupremove`, { chatId: selectedChat._id, userId: user1._id }, config);
      user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
      setFetchAgain(!fetchAgain); fetchMessages(); setLoading(false);
    } catch (error) {
      toast({ title: t("common:errorOccurred"), description: apiErrorText(error, t), status: "error", duration: 5000, isClosable: true, position: "bottom" });
      setLoading(false);
    }
    setGroupChatName("");
  };

  return (<><IconButton d={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} /><Modal onClose={onClose} isOpen={isOpen} isCentered><ModalOverlay /><ModalContent><ModalHeader fontSize="35px" fontFamily="Work sans" d="flex" justifyContent="center">{selectedChat.chatName}</ModalHeader><ModalCloseButton /><ModalBody d="flex" flexDir="column" alignItems="center"><Box w="100%" d="flex" flexWrap="wrap" pb={3}>{selectedChat.users.map((u) => (<UserBadgeItem key={u._id} user={u} admin={selectedChat.groupAdmin} handleFunction={() => handleRemove(u)} />))}</Box><FormControl d="flex"><Input placeholder={t("chat:chatName")} mb={3} value={groupChatName} onChange={(e) => setGroupChatName(e.target.value)} /><Button variant="solid" colorScheme="teal" ml={1} isLoading={renameloading} onClick={handleRename}>{t("chat:update")}</Button></FormControl><FormControl><Input placeholder={t("chat:addUserToGroup")} mb={1} onChange={(e) => handleSearch(e.target.value)} /></FormControl>{loading ? <Spinner size="lg" /> : (searchResult?.map((resultUser) => (<UserListItem key={resultUser._id} user={resultUser} handleFunction={() => handleAddUser(resultUser)} />)))}</ModalBody><ModalFooter><Button onClick={() => handleRemove(user)} colorScheme="red">{t("chat:leaveGroup")}</Button></ModalFooter></ModalContent></Modal></>);
};

export default UpdateGroupChatModal;
