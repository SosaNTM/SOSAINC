/**
 * INTERNATIONALIZATION SETUP
 *
 * Usage:
 *   import { useTranslation } from "react-i18next";
 *   const { t } = useTranslation();
 *   t("common.save") // → "Salva" or "Save" based on language
 *
 * Change language:
 *   import i18n from "@/i18n";
 *   i18n.changeLanguage("en");
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";

const savedLang = localStorage.getItem("SOSA INC_language") || "it";

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: "it",
  interpolation: { escapeValue: false },
});

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
] as const;

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number]["code"];

export function getStoredLanguage(): SupportedLang {
  const stored = localStorage.getItem("SOSA INC_language");
  return (stored === "en" ? "en" : "it") as SupportedLang;
}

export function setLanguage(lang: SupportedLang) {
  i18n.changeLanguage(lang);
  localStorage.setItem("SOSA INC_language", lang);
}
