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
import { ChatState } from "../../Context/ChatProvider";
import ChipsInput from "../common/ChipsInput";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { user, chats, setChats } = ChatState();

  const getUserLabel = (targetUser) => `${targetUser.name} (${targetUser.email})`;

  const handleSearch = async (query) => {
    if (!query) {
      setSearchResult([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/user?search=${query}`, config);
      console.log(data);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  };

  const handleSelectedUserLabelsChange = (nextLabels) => {
    const selectedUsersByLabel = new Map(
      selectedUsers.map((selectedUser) => [getUserLabel(selectedUser), selectedUser])
    );
    const searchUsersByLabel = new Map(
      searchResult.map((searchUser) => [getUserLabel(searchUser), searchUser])
    );

    const nextUsers = [];

    nextLabels.forEach((label) => {
      const matchedUser = selectedUsersByLabel.get(label) || searchUsersByLabel.get(label);

      if (!matchedUser) {
        toast({
          title: "Please choose a valid user",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
        return;
      }

      if (!nextUsers.some((nextUser) => nextUser._id === matchedUser._id)) {
        nextUsers.push(matchedUser);
      }
    });

    setSelectedUsers(nextUsers);
  };

  const handleSubmit = async () => {
    if (!groupChatName || !selectedUsers) {
      toast({
        title: "Please fill all the feilds",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        `/api/chat/group`,
        {
          name: groupChatName,
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        config
      );
      setChats([data, ...chats]);
      onClose();
      toast({
        title: "New Group Chat Created!",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Failed to Create the Chat!",
        description: error.response.data,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            fontSize="35px"
            fontFamily="Work sans"
            d="flex"
            justifyContent="center"
          >
            Create Group Chat
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody d="flex" flexDir="column" alignItems="center">
            <FormControl>
              <Input
                placeholder="Chat Name"
                mb={3}
                onChange={(e) => setGroupChatName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <ChipsInput
                value={selectedUsers.map((selectedUser) => getUserLabel(selectedUser))}
                onChange={handleSelectedUserLabelsChange}
                placeholder="Add Users eg: John, Piyush, Jane"
                suggestions={searchResult.map((searchUser) => getUserLabel(searchUser))}
                onQueryChange={handleSearch}
              />
            </FormControl>
            {loading ? <div>Loading...</div> : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleSubmit} colorScheme="blue">
              Create Chat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
