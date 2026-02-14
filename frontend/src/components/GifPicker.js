import {
  Box,
  Grid,
  GridItem,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const TENOR_API_BASE_URL = "https://tenor.googleapis.com/v2";
const DEFAULT_SEARCH_TERM = "trending";
const RESULT_LIMIT = 18;

const GifPicker = ({ onSelectGif, isDisabled }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const tenorApiKey = useMemo(
    () => process.env.REACT_APP_TENOR_API_KEY || process.env.TENOR_API_KEY,
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const fetchGifs = async () => {
      if (!tenorApiKey) {
        setResults([]);
        return;
      }

      const activeQuery = debouncedQuery || DEFAULT_SEARCH_TERM;

      try {
        setLoading(true);

        const endpoint = debouncedQuery
          ? `${TENOR_API_BASE_URL}/search`
          : `${TENOR_API_BASE_URL}/featured`;

        const { data } = await axios.get(endpoint, {
          params: {
            key: tenorApiKey,
            q: activeQuery,
            limit: RESULT_LIMIT,
            media_filter: "tinygif,gif",
            random: debouncedQuery ? "false" : "true",
          },
        });

        const mapped = (data.results || []).map((item) => {
          const tinyGifUrl = item.media_formats?.tinygif?.url;
          const fullGifUrl = item.media_formats?.gif?.url || tinyGifUrl;

          return {
            id: item.id,
            tinyGifUrl,
            fullGifUrl,
            title: item.content_description || "GIF",
          };
        });

        setResults(mapped.filter((item) => item.tinyGifUrl && item.fullGifUrl));
      } catch (error) {
        setResults([]);
        toast({
          title: "GIF search unavailable",
          description: "Could not fetch GIFs from Tenor. Please try again.",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGifs();
  }, [debouncedQuery, tenorApiKey, toast]);

  const handleSelect = (gif) => {
    onSelectGif({
      url: gif.fullGifUrl,
      previewUrl: gif.tinyGifUrl,
      title: gif.title,
    });
  };

  return (
    <Popover placement="top-start" closeOnBlur>
      <PopoverTrigger>
        <IconButton
          aria-label="Open GIF picker"
          icon={<SearchIcon />}
          isDisabled={isDisabled || !tenorApiKey}
        />
      </PopoverTrigger>
      <PopoverContent w="320px">
        <PopoverBody>
          {!tenorApiKey ? (
            <Text fontSize="sm" color="gray.600">
              Add REACT_APP_TENOR_API_KEY to use GIF search.
            </Text>
          ) : (
            <>
              <InputGroup size="sm" mb={3}>
                <Input
                  placeholder="Search GIFs"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <InputRightElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputRightElement>
              </InputGroup>
              {loading ? (
                <Box py={6} textAlign="center">
                  <Spinner size="sm" />
                </Box>
              ) : (
                <Grid templateColumns="repeat(3, 1fr)" gap={2} maxH="260px" overflowY="auto">
                  {results.map((gif) => (
                    <GridItem key={gif.id}>
                      <Image
                        src={gif.tinyGifUrl}
                        alt={gif.title}
                        borderRadius="md"
                        w="100%"
                        h="80px"
                        objectFit="cover"
                        cursor="pointer"
                        onClick={() => handleSelect(gif)}
                      />
                    </GridItem>
                  ))}
                </Grid>
              )}
            </>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;
