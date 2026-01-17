import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import * as en from '@/locales/en';
import * as ru from '@/locales/ru';

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: {
                translation: ru,
            },
            en: {
                translation: en,
            },
        },
        fallbackLng: 'ru',
        debug: import.meta.env.DEV,

        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
