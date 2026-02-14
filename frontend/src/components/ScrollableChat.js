import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";

const ScrollableChat = ({ messages, latestOutgoingMessage }) => {
  const { user, selectedChat } = ChatState();

  const getReadStatus = (message) => {
    const readByCount = (message.readBy || []).length;
    const participantCount = (selectedChat?.users || []).length;

    if (message.sender._id !== user._id) return "";

    if (readByCount === 0) return "sent";
    if (readByCount === 1) return "delivered";

    if (!selectedChat?.isGroupChat) {
      return "seen";
    }

    if (participantCount > 1 && readByCount >= participantCount) {
      return "seen by everyone";
    }

    return `seen by ${Math.max(readByCount - 1, 0)}`;
  };

  return (
    <>
      {messages &&
        messages.map((m, i) => (
          <div style={{ display: "flex", flexDirection: "column" }} key={m._id}>
            <div style={{ display: "flex" }}>
              {(isSameSender(messages, m, i, user._id) ||
                isLastMessage(messages, i, user._id)) && (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar
                    mt="7px"
                    mr={1}
                    size="sm"
                    cursor="pointer"
                    name={m.sender.name}
                    src={m.sender.pic}
                  />
                </Tooltip>
              )}
              <span
                style={{
                  backgroundColor: `${
                    m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"
                  }`,
                  marginLeft: isSameSenderMargin(messages, m, i, user._id),
                  marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                  borderRadius: "20px",
                  padding: "5px 15px",
                  maxWidth: "75%",
                }}
              >
                {m.content}
              </span>
            </div>
            {latestOutgoingMessage && latestOutgoingMessage._id === m._id && (
              <span
                style={{
                  alignSelf: "flex-end",
                  marginRight: 8,
                  fontSize: "11px",
                  color: "#4A5568",
                  textTransform: "capitalize",
                }}
              >
                {getReadStatus(m)}
              </span>
            )}
          </div>
        ))}
    </>
  );
};

export default ScrollableChat;
