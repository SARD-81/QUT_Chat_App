import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  colors: {
    brand: {
      50: "#eef4ff",
      100: "#d8e6ff",
      200: "#b7d2ff",
      300: "#8db6ff",
      400: "#6296ff",
      500: "#3f76f6",
      600: "#2f5dd7",
      700: "#2448ad",
      800: "#1f3d89",
      900: "#1f356f",
    },
  },
  styles: {
    global: (props) => ({
      "html, body": {
        bg: props.colorMode === "light" ? "gray.50" : "gray.900",
        color: props.colorMode === "light" ? "gray.800" : "gray.100",
        scrollBehavior: "smooth",
      },
      "::selection": {
        background: props.colorMode === "light" ? "brand.200" : "brand.600",
      },
    }),
  },
  radii: {
    md: "10px",
    lg: "14px",
  },
  shadows: {
    sm: "0 1px 2px rgba(16, 24, 40, 0.08)",
    md: "0 4px 14px rgba(16, 24, 40, 0.12)",
    xl: "0 16px 32px rgba(16, 24, 40, 0.16)",
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "md",
        fontWeight: "semibold",
        transition: "all 0.2s ease",
        _focusVisible: { boxShadow: "0 0 0 3px rgba(63, 118, 246, 0.45)" },
      },
      sizes: { md: { h: 10, px: 5 } },
    },
    Input: {
      defaultProps: { focusBorderColor: "brand.500" },
      variants: {
        filled: {
          field: {
            borderRadius: "md",
            _placeholder: { color: "gray.500" },
          },
        },
        outline: {
          field: {
            borderRadius: "md",
            h: 10,
            _placeholder: { color: "gray.500" },
          },
        },
      },
    },
    Drawer: {
      baseStyle: {
        dialog: { borderRadius: "lg" },
        overlay: { backdropFilter: "blur(4px)", bg: "blackAlpha.500" },
      },
    },
    Modal: {
      baseStyle: {
        dialog: { borderRadius: "lg" },
        overlay: { backdropFilter: "blur(4px)", bg: "blackAlpha.500" },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          py: 2,
          borderRadius: "lg",
          boxShadow: "0 8px 24px rgba(17, 24, 39, 0.15)",
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            fontWeight: "semibold",
            _selected: { color: "brand.600", borderColor: "brand.500" },
          },
        },
      },
    },
    Badge: {
      baseStyle: {
        textTransform: "none",
        borderRadius: "full",
        px: 2,
      },
    },
  },
});

export default theme;
