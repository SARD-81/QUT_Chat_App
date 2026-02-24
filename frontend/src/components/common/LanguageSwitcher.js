import { Select } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleChange = (event) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem("appLang", lang);
  };

  return (
    <Select size="sm" value={i18n.language?.startsWith("fa") ? "fa" : "en"} onChange={handleChange} maxW="120px">
      <option value="en">English</option>
      <option value="fa">فارسی</option>
    </Select>
  );
};

export default LanguageSwitcher;
