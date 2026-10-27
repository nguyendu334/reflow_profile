import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import vi from "./vi.json";
import en from "./en.json";
import ko from "./ko.json";

const resources = {
  vi: { translation: vi },
  en: { translation: en },
  ko: { translation: ko },
};

const savedLanguage = localStorage.getItem("reflow-language");

const defaultLanguage = ["vi", "en", "ko"].includes(savedLanguage)
  ? savedLanguage
  : "vi";

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: "vi",
  supportedLngs: ["vi", "en", "ko"],

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
