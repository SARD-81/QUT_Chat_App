import { HStack, Skeleton, SkeletonCircle, SkeletonText, Stack } from "@chakra-ui/react";

const ChatLoading = ({ variant = "chat-list", count = 6 }) => {
  if (variant === "user-list") {
    return (
      <Stack spacing={3} mt={3}>
        {Array.from({ length: count }).map((_, index) => (
          <HStack key={`user-skeleton-${index}`} p={2} borderWidth="1px" borderRadius="md">
            <SkeletonCircle size="10" />
            <SkeletonText noOfLines={2} spacing={2} flex="1" />
          </HStack>
        ))}
      </Stack>
    );
  }

  if (variant === "messages") {
    return (
      <Stack spacing={4} py={2}>
        {Array.from({ length: count }).map((_, index) => (
          <HStack key={`message-skeleton-${index}`} justify={index % 2 ? "flex-end" : "flex-start"}>
            
            <Skeleton h="48px" w={{ base: "75%", md: "62%" }} borderRadius="xl" />
          </HStack>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`chat-skeleton-${index}`} height="52px" borderRadius="md" />
      ))}
    </Stack>
  );
};

export default ChatLoading;
