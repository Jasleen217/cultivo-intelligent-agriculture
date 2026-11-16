import { createContext, useContext, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('cultivo_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('cultivo_lang', lang);
    } catch {
      // ignore storage failure
    }
  };

  const t = (path) => {
    const parts = path.split('.');
    let cur = TRANSLATIONS[language] || TRANSLATIONS.en;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        cur = null;
        break;
      }
    }
    if (typeof cur === 'string') return cur;

    // fallback to English
    let enCur = TRANSLATIONS.en;
    for (const part of parts) {
      if (enCur && Object.prototype.hasOwnProperty.call(enCur, part)) {
        enCur = enCur[part];
      } else {
        return path;
      }
    }
    return typeof enCur === 'string' ? enCur : path;
  };

  const getLocalizedCropName = (crop) => {
    if (!crop) return '';
    if (language === 'hi' && crop.hindiName) return `${crop.hindiName} (${crop.name})`;
    if (language === 'pa' && crop.punjabiName) return `${crop.punjabiName} (${crop.name})`;
    return crop.name || crop.cropName || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedCropName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
