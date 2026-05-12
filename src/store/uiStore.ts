import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

type Theme = 'light' | 'dark';
type Language = 'ar' | 'de';
export type Currency = 'USD' | 'SYP' | 'TRY';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ExchangeRates {
  usd_to_syp: number;
  usd_to_try: number;
  try_to_syp: number;
}

interface UIState {
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
  hideFinancials: boolean;
  toasts: Toast[];
  exchangeRates: ExchangeRates;
  remindersRefreshKey: number;
  defaultCurrency: Currency;
  autoLogoutMinutes: number;
  showCurrencyCalc: boolean;
  avatarColors: Record<string, string>;
  shopName: string;
  shopLogo: string;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  toggleSidebar: () => void;
  toggleHideFinancials: () => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  setExchangeRates: (r: ExchangeRates) => void;
  bumpReminders: () => void;
  setDefaultCurrency: (c: Currency) => void;
  setAutoLogoutMinutes: (m: number) => void;
  setShowCurrencyCalc: (v: boolean) => void;
  setAvatarColor: (userId: string, color: string) => void;
  setShopName: (name: string) => void;
  setShopLogo: (logo: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'ar',
      sidebarOpen: true,
      hideFinancials: false,
      toasts: [],
      exchangeRates: { usd_to_syp: 14000, usd_to_try: 34, try_to_syp: 412 },
      defaultCurrency: 'USD',
      autoLogoutMinutes: 0,
      showCurrencyCalc: false,
      avatarColors: {},
      shopName: '',
      shopLogo: '',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },
      setLanguage: (language) => {
        set({ language });
        i18n.changeLanguage(language);
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleHideFinancials: () => set((s) => ({ hideFinancials: !s.hideFinancials })),
      addToast: (type, message) => {
        const id = Date.now().toString();
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setExchangeRates: (exchangeRates) => set({ exchangeRates }),
      remindersRefreshKey: 0,
      bumpReminders: () => set((s) => ({ remindersRefreshKey: s.remindersRefreshKey + 1 })),
      setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
      setAutoLogoutMinutes: (autoLogoutMinutes) => set({ autoLogoutMinutes }),
      setShowCurrencyCalc: (showCurrencyCalc) => set({ showCurrencyCalc }),
      setAvatarColor: (userId, color) => set((s) => ({ avatarColors: { ...s.avatarColors, [userId]: color } })),
      setShopName: (shopName) => set({ shopName }),
      setShopLogo: (shopLogo) => set({ shopLogo }),
    }),
    { name: 'bridal-ui', partialize: (s) => ({ theme: s.theme, language: s.language, exchangeRates: s.exchangeRates, defaultCurrency: s.defaultCurrency, autoLogoutMinutes: s.autoLogoutMinutes, showCurrencyCalc: s.showCurrencyCalc, avatarColors: s.avatarColors }) }
  )
);
