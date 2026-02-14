import { Avatar } from "@chakra-ui/avatar";
import { Box, Text, useColorModeValue } from "@chakra-ui/react";

const UserListItem = ({ user, handleFunction }) => {
  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg={useColorModeValue("gray.100", "whiteAlpha.100")}
      _hover={{ background: useColorModeValue("brand.500", "brand.400"), color: "white", transform: "translateY(-1px)" }}
      transition="all 0.2s ease"
      w="100%"
      d="flex"
      alignItems="center"
      px={3}
      py={2}
      mb={2}
      borderRadius="md"
    >
      <Avatar mr={2} size="sm" name={user.name} src={user.pic} />
      <Box>
        <Text fontWeight="semibold">{user.name}</Text>
        <Text fontSize="xs"><b>Email: </b>{user.email}</Text>
      </Box>
    </Box>
  );
};

export default UserListItem;
