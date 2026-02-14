import { Box, Container, useColorModeValue } from "@chakra-ui/react";

const AppShell = ({ children, maxW = "7xl" }) => (
  <Box minH="100vh" py={{ base: 3, md: 5 }} px={{ base: 2, md: 4 }}>
    <Container maxW={maxW} px={{ base: 0, md: 2 }}>
      <Box
        bg={useColorModeValue("whiteAlpha.700", "blackAlpha.300")}
        border="1px solid"
        borderColor={useColorModeValue("blackAlpha.100", "whiteAlpha.200")}
        borderRadius="lg"
        p={{ base: 3, md: 4 }}
      >
        {children}
      </Box>
    </Container>
  </Box>
);

export default AppShell;
