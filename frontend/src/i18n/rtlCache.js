import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";

export const ltrCache = createCache({ key: "chakra" });
export const rtlCache = createCache({ key: "chakra-rtl", stylisPlugins: [rtlPlugin] });
