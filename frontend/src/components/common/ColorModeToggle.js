import { IconButton, useColorMode, useColorModeValue } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

const ColorModeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const isLight = colorMode === "light";

  return (
    <IconButton
      size="sm"
      variant="ghost"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      icon={isLight ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
      color={useColorModeValue("gray.700", "gray.100")}
    />
  );
};

export default ColorModeToggle;
