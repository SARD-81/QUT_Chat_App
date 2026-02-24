import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useState } from "react";
import { useHistory } from "react-router";
import { useTranslation } from "react-i18next";
import { uploadFileToCloudinary, validateAttachmentFile } from "../../config/uploadConfig";
import { appToast } from "../../utils/toast";
import { apiErrorText } from "../../utils/apiErrorText";

const Signup = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const toast = useToast();
  const history = useHistory();
  const { t } = useTranslation(["auth", "common", "errors"]);

  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [confirmpassword, setConfirmpassword] = useState();
  const [password, setPassword] = useState();
  const [pic, setPic] = useState();
  const [picLoading, setPicLoading] = useState(false);

  const submitHandler = async () => {
    setPicLoading(true);
    if (!name || !email || !password || !confirmpassword) {
      toast({ ...appToast, title: t("auth:pleaseFillAllFields"), status: "warning", duration: 5000, isClosable: true, position: "bottom" });
      setPicLoading(false);
      return;
    }
    if (password !== confirmpassword) {
      toast({ ...appToast, title: t("auth:passwordsDoNotMatch"), status: "warning", duration: 5000, isClosable: true, position: "bottom" });
      return;
    }
    try {
      const config = { headers: { "Content-type": "application/json" } };
      const { data } = await axios.post("/api/user", { name, email, password, pic }, config);
      toast({ ...appToast, title: t("auth:registrationSuccessful"), status: "success", duration: 5000, isClosable: true, position: "bottom" });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setPicLoading(false);
      history.push("/chats");
    } catch (error) {
      toast({ ...appToast, title: t("common:errorOccurred"), description: apiErrorText(error, t), status: "error", duration: 5000, isClosable: true, position: "bottom" });
      setPicLoading(false);
    }
  };

  const postDetails = async (pics) => {
    setPicLoading(true);
    const validationError = validateAttachmentFile(pics, { avatarOnly: true });
    if (validationError) {
      toast({ ...appToast, title: validationError, status: "warning", duration: 5000, isClosable: true, position: "bottom" });
      setPicLoading(false);
      return;
    }

    try {
      const uploaded = await uploadFileToCloudinary(pics, "avatar");
      setPic(uploaded.url);
    } catch (err) {
      toast({ ...appToast, title: t("auth:imageUploadFailed"), description: err.response?.data?.message || t("auth:pleaseTryAgain"), status: "error", duration: 5000, isClosable: true, position: "bottom" });
    } finally {
      setPicLoading(false);
    }
  };

  return (
    <VStack spacing="5px">
      <FormControl id="first-name" isRequired><FormLabel>{t("auth:name")}</FormLabel><Input placeholder={t("auth:enterYourName")} onChange={(e) => setName(e.target.value)} /></FormControl>
      <FormControl id="email" isRequired><FormLabel>{t("common:emailAddress")}</FormLabel><Input type="email" placeholder={t("auth:enterEmail")} onChange={(e) => setEmail(e.target.value)} /></FormControl>
      <FormControl id="password" isRequired>
        <FormLabel>{t("common:password")}</FormLabel>
        <InputGroup size="md"><Input type={show ? "text" : "password"} placeholder={t("auth:enterPassword")} onChange={(e) => setPassword(e.target.value)} />
          <InputRightElement width="4.5rem"><Button h="1.75rem" size="sm" onClick={handleClick}>{show ? t("common:hide") : t("common:show")}</Button></InputRightElement>
        </InputGroup>
      </FormControl>
      <FormControl id="password" isRequired>
        <FormLabel>{t("auth:confirmPassword")}</FormLabel>
        <InputGroup size="md"><Input type={show ? "text" : "password"} placeholder={t("auth:confirmPasswordPlaceholder")} onChange={(e) => setConfirmpassword(e.target.value)} />
          <InputRightElement width="4.5rem"><Button h="1.75rem" size="sm" onClick={handleClick}>{show ? t("common:hide") : t("common:show")}</Button></InputRightElement>
        </InputGroup>
      </FormControl>
      <FormControl id="pic"><FormLabel>{t("auth:uploadPicture")}</FormLabel><Input type="file" p={1.5} accept="image/*" onChange={(e) => postDetails(e.target.files[0])} /></FormControl>
      <Button colorScheme="blue" width="100%" style={{ marginTop: 15 }} onClick={submitHandler} isLoading={picLoading}>{t("auth:signUp")}</Button>
    </VStack>
  );
};

export default Signup;
