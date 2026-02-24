import i18n from "../i18n";

export const formatMessageTime = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  return new Intl.DateTimeFormat(i18n.language || "en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
