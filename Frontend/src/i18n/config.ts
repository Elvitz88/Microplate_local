import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '../locales/en/translation.json';
import thTranslations from '../locales/th/translation.json';
import enAiEthics from '../locales/en/aiEthics.json';
import thAiEthics from '../locales/th/aiEthics.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...enTranslations,
          ...enAiEthics,
        },
      },
      th: {
        translation: {
          ...thTranslations,
          ...thAiEthics,
        },
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'th'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

