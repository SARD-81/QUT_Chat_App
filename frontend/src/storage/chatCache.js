import { openDB } from "idb";

const DB_NAME = "qut-chat-cache";
const DB_VERSION = 1;
const CHATS_STORE = "chats";
const MESSAGES_STORE = "messages";
const CHATS_CACHE_KEY = "chat-list";
const MAX_MESSAGES_PER_CHAT = 50;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(CHATS_STORE)) {
      db.createObjectStore(CHATS_STORE);
    }

    if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
      db.createObjectStore(MESSAGES_STORE, { keyPath: "chatId" });
    }
  },
});

export const loadCachedChats = async () => {
  const db = await dbPromise;
  const chats = await db.get(CHATS_STORE, CHATS_CACHE_KEY);
  return Array.isArray(chats) ? chats : [];
};

export const cacheChats = async (chats = []) => {
  const db = await dbPromise;
  await db.put(CHATS_STORE, chats, CHATS_CACHE_KEY);
};

export const loadCachedMessages = async (chatId) => {
  if (!chatId) return [];

  const db = await dbPromise;
  const entry = await db.get(MESSAGES_STORE, chatId);

  return Array.isArray(entry?.messages) ? entry.messages : [];
};

export const cacheMessages = async (chatId, messages = []) => {
  if (!chatId) return;

  const db = await dbPromise;
  const recentMessages = Array.isArray(messages)
    ? messages.slice(-MAX_MESSAGES_PER_CHAT)
    : [];

  await db.put(MESSAGES_STORE, {
    chatId,
    messages: recentMessages,
    updatedAt: Date.now(),
  });
};
