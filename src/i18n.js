import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

i18n
  .use(HttpApi) // Load translation files dynamically
  .use(LanguageDetector) // Detect user's language
  .use(initReactI18next) // Bind to React
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "es", "fr", "zh-CN", "zh-TW"], // Added Simplified & Traditional Chinese
    debug: true,
    detection: {
      order: ["navigator", "htmlTag", "cookie", "localStorage", "sessionStorage", "querystring"],
      caches: ["cookie"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json", // Path to load language files dynamically
    },
  });

export default i18n;
