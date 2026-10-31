'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '@/lib/i18n';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
  isUrdu: false,
  dir: 'ltr',
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('hs_lang');
      if (saved === 'ur' || saved === 'en') setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem('hs_lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next === 'ur' ? 'ur' : 'en');
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'ur' : 'en'));
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, isUrdu: lang === 'ur', dir: lang === 'ur' ? 'rtl' : 'ltr' }),
    [lang, setLang, toggleLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
