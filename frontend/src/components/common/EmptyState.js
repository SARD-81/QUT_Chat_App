import { Box, Icon, Text, VStack, useColorModeValue } from "@chakra-ui/react";

const EmptyState = ({ icon, title, hint }) => {
  return (
    <VStack
      spacing={3}
      py={8}
      px={4}
      textAlign="center"
      color={useColorModeValue("gray.600", "gray.300")}
    >
      <Box
        p={3}
        borderRadius="full"
        bg={useColorModeValue("gray.100", "whiteAlpha.100")}
      >
        <Icon as={icon} boxSize={6} />
      </Box>
      <Text fontWeight="semibold">{title}</Text>
      <Text fontSize="sm">{hint}</Text>
    </VStack>
  );
};

export default EmptyState;
