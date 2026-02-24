import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  FormControl,
  Input,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatState } from "../../Context/ChatProvider";
import ChipsInput from "../common/ChipsInput";
import { apiErrorText } from "../../utils/apiErrorText";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { t } = useTranslation(["chat", "common", "errors"]);

  const { user, chats, setChats } = ChatState();
  const getUserLabel = (targetUser) => `${targetUser.name} (${targetUser.email})`;

  const handleSearch = async (query) => {
    if (!query) return setSearchResult([]);
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/user?search=${query}`, config);
      setSearchResult(data);
    } catch (error) {
      toast({ title: t("common:errorOccurred"), description: apiErrorText(error, t) || t("chat:failedSearchResults"), status: "error", duration: 5000, isClosable: true, position: "bottom-left" });
    } finally { setLoading(false); }
  };

  const handleSelectedUserLabelsChange = (nextLabels) => {
    const selectedUsersByLabel = new Map(selectedUsers.map((selectedUser) => [getUserLabel(selectedUser), selectedUser]));
    const searchUsersByLabel = new Map(searchResult.map((searchUser) => [getUserLabel(searchUser), searchUser]));
    const nextUsers = [];
    nextLabels.forEach((label) => {
      const matchedUser = selectedUsersByLabel.get(label) || searchUsersByLabel.get(label);
      if (!matchedUser) return toast({ title: t("chat:validUser"), status: "warning", duration: 3000, isClosable: true, position: "top" });
      if (!nextUsers.some((nextUser) => nextUser._id === matchedUser._id)) nextUsers.push(matchedUser);
    });
    setSelectedUsers(nextUsers);
  };

  const handleSubmit = async () => {
    if (!groupChatName || !selectedUsers) {
      toast({ title: t("chat:pleaseFillGroupFields"), status: "warning", duration: 5000, isClosable: true, position: "top" });
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`/api/chat/group`, { name: groupChatName, users: JSON.stringify(selectedUsers.map((u) => u._id)) }, config);
      setChats([data, ...chats]);
      onClose();
      toast({ title: t("chat:newGroupCreated"), status: "success", duration: 5000, isClosable: true, position: "bottom" });
    } catch (error) {
      toast({ title: t("chat:failedCreateChat"), description: apiErrorText(error, t), status: "error", duration: 5000, isClosable: true, position: "bottom" });
      setLoading(false);
    }
  };

  return (<><span onClick={onOpen}>{children}</span><Modal onClose={onClose} isOpen={isOpen} isCentered><ModalOverlay /><ModalContent><ModalHeader fontSize="35px" fontFamily="Work sans" d="flex" justifyContent="center">{t("chat:createGroupChat")}</ModalHeader><ModalCloseButton /><ModalBody d="flex" flexDir="column" alignItems="center"><FormControl><Input placeholder={t("chat:chatName")} mb={3} onChange={(e) => setGroupChatName(e.target.value)} /></FormControl><FormControl><ChipsInput value={selectedUsers.map((selectedUser) => getUserLabel(selectedUser))} onChange={handleSelectedUserLabelsChange} placeholder={t("chat:addUsers")} suggestions={searchResult.map((searchUser) => getUserLabel(searchUser))} onQueryChange={handleSearch} /></FormControl>{loading ? <div>{t("common:loading")}</div> : null}</ModalBody><ModalFooter><Button onClick={handleSubmit} colorScheme="blue">{t("chat:createChat")}</Button></ModalFooter></ModalContent></Modal></>);
};

export default GroupChatModal;
