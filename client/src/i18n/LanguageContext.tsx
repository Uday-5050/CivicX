import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import en from './en.json';
import hi from './hi.json';

export type Language = 'en' | 'hi';

type Translations = typeof en;

const translations: Record<Language, Translations> = {
  en,
  hi: hi as unknown as Translations,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('civicx_lang');
    return saved === 'hi' ? 'hi' : 'en';
  });
  const [, startTransition] = useTransition();

  useEffect(() => {
    localStorage.setItem('civicx_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    startTransition(() => {
      setLanguageState(lang);
    });
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let current: unknown = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return keyPath;
      }
    }

    return typeof current === 'string' ? current : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
