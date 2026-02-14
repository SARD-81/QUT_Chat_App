import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Input,
  List,
  ListItem,
  Tag,
  TagCloseButton,
  TagLabel,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";

const normalize = (value) => value.trim().toLowerCase();

const ChipsInput = ({
  value,
  onChange,
  placeholder = "Add item",
  suggestions = [],
  onQueryChange,
  maxChips,
}) => {
  const [query, setQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const hasMax = typeof maxChips === "number";

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = normalize(query);

    return suggestions
      .filter((suggestion) => {
        if (!normalizedQuery) {
          return true;
        }

        return suggestion.toLowerCase().includes(normalizedQuery);
      })
      .filter(
        (suggestion) =>
          !value.some((chip) => normalize(chip) === normalize(suggestion))
      )
      .slice(0, 6);
  }, [query, suggestions, value]);

  useEffect(() => {
    setActiveSuggestionIndex(filteredSuggestions.length ? 0 : -1);
  }, [filteredSuggestions]);

  const addChip = (candidate) => {
    const trimmed = candidate.trim();

    if (!trimmed) {
      return;
    }

    if (hasMax && value.length >= maxChips) {
      return;
    }

    const duplicate = value.some((chip) => normalize(chip) === normalize(trimmed));

    if (duplicate) {
      return;
    }

    onChange([...value, trimmed]);
    setQuery("");
    onQueryChange?.("");
    setShowSuggestions(false);
  };

  const removeChip = (chipToRemove) => {
    onChange(value.filter((chip) => chip !== chipToRemove));
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onQueryChange?.(nextValue);
    setShowSuggestions(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (showSuggestions && activeSuggestionIndex >= 0 && filteredSuggestions.length) {
        addChip(filteredSuggestions[activeSuggestionIndex]);
        return;
      }
      addChip(query);
      return;
    }

    if (event.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
      return;
    }

    if (!showSuggestions || !filteredSuggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex < filteredSuggestions.length - 1 ? prevIndex + 1 : 0
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : filteredSuggestions.length - 1
      );
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <Box position="relative" w="100%">
      <Wrap
        spacing={2}
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={2}
        minH="42px"
        _focusWithin={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
      >
        {value.map((chip) => (
          <WrapItem key={chip}>
            <Tag size="md" borderRadius="full" variant="subtle" colorScheme="blue">
              <TagLabel>{chip}</TagLabel>
              <TagCloseButton
                aria-label={`Remove ${chip}`}
                onClick={() => removeChip(chip)}
              />
            </Tag>
          </WrapItem>
        ))}
        {(!hasMax || value.length < maxChips) && (
          <WrapItem flex="1" minW="220px">
            <Input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              variant="unstyled"
              placeholder={placeholder}
              aria-label={placeholder}
            />
          </WrapItem>
        )}
      </Wrap>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <List
          mt={1}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="sm"
          maxH="200px"
          overflowY="auto"
          position="absolute"
          zIndex={2}
          w="100%"
          aria-label="Suggestions"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <ListItem
              key={suggestion}
              px={3}
              py={2}
              bg={index === activeSuggestionIndex ? "gray.100" : "white"}
              _hover={{ bg: "gray.100", cursor: "pointer" }}
              onMouseDown={(event) => {
                event.preventDefault();
                addChip(suggestion);
                inputRef.current?.focus();
              }}
            >
              {suggestion}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ChipsInput;
