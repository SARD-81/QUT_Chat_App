import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { CacheProvider } from "@emotion/react";
import ChatProvider from "./Context/ChatProvider";
import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import theme from "./theme";
import "./i18n";
import { ltrCache, rtlCache } from "./i18n/rtlCache";

const AppProviders = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("fa") ? "fa" : "en";
  const currentDir = currentLang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentDir;
  }, [currentLang, currentDir]);

  return (
    <CacheProvider value={currentDir === "rtl" ? rtlCache : ltrCache}>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <BrowserRouter>
          <ChatProvider>
            <App />
          </ChatProvider>
        </BrowserRouter>
      </ChakraProvider>
    </CacheProvider>
  );
};

ReactDOM.render(<AppProviders />, document.getElementById("root"));

reportWebVitals();
