import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  IconButton,
  Text,
  HStack,
  Button,
  Wrap,
  WrapItem,
  Box,
  Link,
  Image,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ScrollableChat = ({
  messages,
  latestOutgoingMessage,
  onEditMessage,
  onDeleteMessage,
  onReact,
  onReply,
  replyingToMessageId,
}) => {
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
        label:
          readByOthersCount >= (selectedChat?.users?.length || 1) - 1
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
        label:
          deliveredToCount >= (selectedChat?.users?.length || 1) - 1
            ? "delivered to everyone"
            : `delivered to ${deliveredToCount}`,
      };
    }

    if (message.socketStatus === "sending") {
      return { icon: "…", label: "sending" };
    }

    return { icon: "✓", label: "sent" };
  };

  const getReactionSummary = (message) => {
    const grouped = (message.reactions || []).reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped);
  };

  return (
    <>
      {messages &&
        messages.map((m, i) => {
          const messageStatus = getMessageStatus(m);
          const isOwnMessage = m.sender._id === user._id;
          const reactionSummary = getReactionSummary(m);
          const isReplyTargeted = replyingToMessageId === m._id;

          return (
            <div style={{ display: "flex", flexDirection: "column" }} key={m._id}>
              <div style={{ display: "flex", alignItems: "center" }}>
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
                <Box
                  style={{
                    backgroundColor: `${
                      m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"
                    }`,
                    marginLeft: isSameSenderMargin(messages, m, i, user._id),
                    marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                    borderRadius: "20px",
                    padding: "5px 15px",
                    maxWidth: "75%",
                    fontStyle: m.isDeleted ? "italic" : "normal",
                    opacity: m.isDeleted ? 0.75 : 1,
                    border: isReplyTargeted ? "2px solid #3182CE" : "none",
                  }}
                >
                  {m.replyTo && (
                    <Box
                      bg="whiteAlpha.800"
                      borderRadius="md"
                      p={2}
                      mb={2}
                      borderLeft="3px solid #3182CE"
                    >
                      <Text fontSize="xs" color="gray.700" fontWeight="semibold">
                        Replying to {m.replyTo?.sender?.name || "message"}
                      </Text>
                      <Text fontSize="sm" color="gray.700" noOfLines={2}>
                        {m.replyTo?.isDeleted ? "This message was deleted" : m.replyTo?.content}
                      </Text>
                    </Box>
                  )}
                  {m.content && <Text>{m.content}</Text>}
                  {m.attachment?.url && (
                    <Box mt={2}>
                      {m.attachment.mimeType?.startsWith("image/") ? (
                        <Link href={m.attachment.url} isExternal>
                          <Image
                            src={m.attachment.url}
                            alt={m.attachment.fileName || "attachment"}
                            maxH="220px"
                            borderRadius="md"
                          />
                        </Link>
                      ) : (
                        <Link href={m.attachment.url} isExternal color="blue.600" fontWeight="semibold">
                          Download {m.attachment.fileName || "file"}
                        </Link>
                      )}
                    </Box>
                  )}
                  {m.editedAt && !m.isDeleted && (
                    <Text as="span" fontSize="xs" color="gray.600" ml={2}>
                      (edited)
                    </Text>
                  )}
                  <Wrap spacing={1} mt={2}>
                    {reactionSummary.map(([emoji, count]) => (
                      <WrapItem key={`${m._id}-${emoji}`}>
                        <Button size="xs" borderRadius="full" onClick={() => onReact(m, emoji)}>
                          {emoji} {count}
                        </Button>
                      </WrapItem>
                    ))}
                  </Wrap>
                  <HStack spacing={1} mt={2}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <Button
                        key={`${m._id}-${emoji}-quick`}
                        size="xs"
                        variant="ghost"
                        minW="auto"
                        onClick={() => onReact(m, emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </HStack>
                </Box>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Message actions"
                    icon={<ChevronDownIcon />}
                    size="xs"
                    ml={2}
                    variant="ghost"
                  />
                  <MenuList>
                    <MenuItem onClick={() => onReply(m)}>Reply</MenuItem>
                    {isOwnMessage && (
                      <MenuItem onClick={() => onEditMessage(m)} isDisabled={m.isDeleted}>
                        Edit
                      </MenuItem>
                    )}
                    {isOwnMessage && (
                      <MenuItem onClick={() => onDeleteMessage(m)} isDisabled={m.isDeleted}>
                        Delete
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
              </div>
              {latestOutgoingMessage &&
                latestOutgoingMessage._id === m._id &&
                messageStatus && (
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
