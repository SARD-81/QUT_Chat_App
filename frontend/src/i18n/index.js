import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enAuth from "../locales/en/auth.json";
import enChat from "../locales/en/chat.json";
import enMessage from "../locales/en/message.json";
import enErrors from "../locales/en/errors.json";

import faCommon from "../locales/fa/common.json";
import faAuth from "../locales/fa/auth.json";
import faChat from "../locales/fa/chat.json";
import faMessage from "../locales/fa/message.json";
import faErrors from "../locales/fa/errors.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    chat: enChat,
    message: enMessage,
    errors: enErrors,
  },
  fa: {
    common: faCommon,
    auth: faAuth,
    chat: faChat,
    message: faMessage,
    errors: faErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "fa"],
    ns: ["common", "auth", "chat", "message", "errors"],
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "appLang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
