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
  useColorModeValue,
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

const ScrollableChat = ({ messages, latestOutgoingMessage, onEditMessage, onDeleteMessage, onReact, onReply, replyingToMessageId }) => {
  const { user, selectedChat } = ChatState();
  const ownBubbleBg = useColorModeValue("brand.100", "brand.700");
  const otherBubbleBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const replyPreviewBg = useColorModeValue("white", "blackAlpha.300");

  const getMessageStatus = (message) => {
    if (message.sender._id !== user._id) return null;
    const readByOthersCount = (message.readBy || []).filter((readUserId) => readUserId.toString() !== user._id.toString()).length;
    const deliveredToCount = (message.deliveredTo || []).filter((deliveredUserId) => deliveredUserId.toString() !== user._id.toString()).length;
    if (readByOthersCount > 0) return { icon: "👁", label: !selectedChat?.isGroupChat ? "seen" : `seen by ${readByOthersCount}` };
    if (deliveredToCount > 0) return { icon: "✓✓", label: !selectedChat?.isGroupChat ? "delivered" : `delivered to ${deliveredToCount}` };
    if (message.socketStatus === "sending") return { icon: "…", label: "sending" };
    return { icon: "✓", label: "sent" };
  };

  return (
    <>
      {messages?.map((m, i) => {
        const messageStatus = getMessageStatus(m);
        const isOwnMessage = m.sender._id === user._id;
        const reactionSummary = Object.entries((m.reactions || []).reduce((acc, reaction) => ({ ...acc, [reaction.emoji]: (acc[reaction.emoji] || 0) + 1 }), {}));
        const isReplyTargeted = replyingToMessageId === m._id;

        return (
          <Box display="flex" flexDirection="column" key={m._id}>
            <Box display="flex" alignItems="center" mt={isSameUser(messages, m, i, user._id) ? 1 : 2}>
              {(isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id)) && (
                <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                  <Avatar mt="7px" mr={1} size="sm" cursor="pointer" name={m.sender.name} src={m.sender.pic} />
                </Tooltip>
              )}
              <Box
                bg={isOwnMessage ? ownBubbleBg : otherBubbleBg}
                ml={isSameSenderMargin(messages, m, i, user._id)}
                borderRadius="2xl"
                p="10px 14px"
                maxW="75%"
                fontStyle={m.isDeleted ? "italic" : "normal"}
                opacity={m.isDeleted ? 0.75 : 1}
                border={isReplyTargeted ? "2px solid" : "1px solid"}
                borderColor={isReplyTargeted ? "brand.500" : "transparent"}
                transition="all 0.2s ease"
                _hover={{ boxShadow: "sm" }}
              >
                {m.replyTo && (
                  <Box bg={replyPreviewBg} borderRadius="md" p={2} mb={2} borderLeft="3px solid" borderLeftColor="brand.500">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold">Replying to {m.replyTo?.sender?.name || "message"}</Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={2}>{m.replyTo?.isDeleted ? "This message was deleted" : m.replyTo?.type === "gif" ? "GIF" : m.replyTo?.content}</Text>
                  </Box>
                )}
                {m.type === "gif" && m.content ? (
                  <Link href={m.content} isExternal>
                    <Image src={m.content} alt="GIF" maxH="240px" borderRadius="md" objectFit="cover" />
                  </Link>
                ) : (
                  m.content && <Text lineHeight="1.5">{m.content}</Text>
                )}
                {m.attachment?.url && (
                  <Box mt={2}>
                    {m.attachment.mimeType?.startsWith("image/") ? (
                      <Link href={m.attachment.url} isExternal>
                        <Image src={m.attachment.url} alt={m.attachment.fileName || "attachment"} maxH="220px" borderRadius="md" />
                      </Link>
                    ) : (
                      <Link href={m.attachment.url} isExternal color="brand.600" fontWeight="semibold" _hover={{ textDecoration: "underline" }}>
                        Download {m.attachment.fileName || "file"}
                      </Link>
                    )}
                  </Box>
                )}
                <HStack justify="space-between" mt={1}>
                  {m.editedAt && !m.isDeleted ? <Text as="span" fontSize="xs" color="gray.500">edited</Text> : <span />}
                  <Text fontSize="xs" color="gray.500">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </HStack>
                <Wrap spacing={1} mt={2}>{reactionSummary.map(([emoji, count]) => <WrapItem key={`${m._id}-${emoji}`}><Button size="xs" borderRadius="full" onClick={() => onReact(m, emoji)}>{emoji} {count}</Button></WrapItem>)}</Wrap>
                <HStack spacing={1} mt={2}>{QUICK_REACTIONS.map((emoji) => <Button key={`${m._id}-${emoji}-quick`} size="xs" variant="ghost" minW="auto" onClick={() => onReact(m, emoji)}>{emoji}</Button>)}</HStack>
              </Box>
              <Menu>
                <MenuButton as={IconButton} aria-label="Message actions" icon={<ChevronDownIcon />} size="xs" ml={2} variant="ghost" />
                <MenuList>
                  <MenuItem onClick={() => onReply(m)}>Reply</MenuItem>
                  {isOwnMessage && <MenuItem onClick={() => onEditMessage(m)} isDisabled={m.isDeleted}>Edit</MenuItem>}
                  {isOwnMessage && <MenuItem onClick={() => onDeleteMessage(m)} isDisabled={m.isDeleted}>Delete</MenuItem>}
                </MenuList>
              </Menu>
            </Box>
            {latestOutgoingMessage && latestOutgoingMessage._id === m._id && messageStatus && (
              <Text alignSelf="flex-end" mr={2} fontSize="11px" color="gray.500" textTransform="capitalize">
                {`${messageStatus.icon} ${messageStatus.label}`}
              </Text>
            )}
          </Box>
        );
      })}
    </>
  );
};

export default ScrollableChat;
