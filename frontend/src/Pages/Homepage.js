import {
  Box,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useHistory } from "react-router";
import { useTranslation } from "react-i18next";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import AppShell from "../components/layout/AppShell";

function Homepage() {
  const history = useHistory();
  const { t } = useTranslation(["common", "auth"]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) history.push("/chats");
  }, [history]);

  return (
    <AppShell maxW="2xl">
      <Box
        textAlign="center"
        p={5}
        bg={useColorModeValue("white", "gray.800")}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={useColorModeValue("gray.100", "whiteAlpha.200")}
        mb={4}
        shadow="sm"
      >
        <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold" letterSpacing="tight">
          {t("common:appName")}
        </Text>
        <Text mt={1} fontSize="sm" color={useColorModeValue("gray.500", "gray.400")}>
          {t("auth:tagline")}
        </Text>
      </Box>
      <Box bg={useColorModeValue("white", "gray.800")} p={4} borderRadius="lg" borderWidth="1px" shadow="sm">
        <Tabs isFitted variant="line" colorScheme="brand">
          <TabList mb="1em">
            <Tab>{t("auth:loginTab")}</Tab>
            <Tab>{t("auth:signupTab")}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={1}>
              <Login />
            </TabPanel>
            <TabPanel px={1}>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </AppShell>
  );
}

export default Homepage;
