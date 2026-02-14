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

  const getMessageStatus = (message) => {
    if (message.sender._id !== user._id) return null;

    const readByOthersCount = (message.readBy || []).filter(
      (readUserId) => readUserId.toString() !== user._id.toString()
    ).length;
    const deliveredToCount = (message.deliveredTo || []).filter(
      (deliveredUserId) => deliveredUserId.toString() !== user._id.toString()
    ).length;

    if (readByOthersCount > 0) {
      if (!selectedChat?.isGroupChat) {
        return { icon: "👁", label: "seen" };
      }

      return {
        icon: "👁",
        label: readByOthersCount >= (selectedChat?.users?.length || 1) - 1
          ? "seen by everyone"
          : `seen by ${readByOthersCount}`,
      };
    }

    if (deliveredToCount > 0) {
      if (!selectedChat?.isGroupChat) {
        return { icon: "✓✓", label: "delivered" };
      }

      return {
        icon: "✓✓",
        label: deliveredToCount >= (selectedChat?.users?.length || 1) - 1
          ? "delivered to everyone"
          : `delivered to ${deliveredToCount}`,
      };
    }

    if (message.socketStatus === "sending") {
      return { icon: "…", label: "sending" };
    }

    return { icon: "✓", label: "sent" };
  };

  return (
    <>
      {messages &&
        messages.map((m, i) => {
          const messageStatus = getMessageStatus(m);

          return (
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
            {latestOutgoingMessage && latestOutgoingMessage._id === m._id && messageStatus && (
              <span
                style={{
                  alignSelf: "flex-end",
                  marginRight: 8,
                  fontSize: "11px",
                  color: "#4A5568",
                  textTransform: "capitalize",
                }}
              >
                {`${messageStatus.icon} ${messageStatus.label}`}
              </span>
            )}
          </div>
          );
        })}
    </>
  );
};

export default ScrollableChat;
