import { Box, Text } from "@chakra-ui/layout";

const OfflineBanner = () => {
  return (
    <Box bg="orange.400" color="white" textAlign="center" py={2} px={4}>
      <Text fontSize="sm" fontWeight="semibold">
        You are offline. Viewing cached chats and messages.
      </Text>
    </Box>
  );
};

export default OfflineBanner;
