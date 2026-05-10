import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import de from './de';

function getPersistedLanguage(): string {
  try {
    const raw = localStorage.getItem('bridal-ui');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.language ?? 'ar';
    }
  } catch {
    // ignore
  }
  return 'ar';
}

i18n
  .use(initReactI18next)
  .init({
    resources: { ar, de },
    lng: getPersistedLanguage(),
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
