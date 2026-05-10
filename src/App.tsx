import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { api } from './lib/api';

import { Layout } from './components/Layout';
import { Homepage } from './modules/home/Homepage';
import { Dashboard } from './modules/dashboard/Dashboard';
import { InventoryList } from './modules/inventory/InventoryList';
import { CleaningList } from './modules/inventory/CleaningList';
import { SalesList } from './modules/sales/SalesList';
import { RentalsList } from './modules/rentals/RentalsList';
import { CustomerList } from './modules/customers/CustomerList';
import { ExpenseList } from './modules/expenses/ExpenseList';
import { Reports } from './modules/reports/Reports';
import { Settings } from './modules/settings/Settings';
import { RemindersList } from './modules/reminders/RemindersList';
import { ActivityLogPage } from './modules/activity/ActivityLogPage';
import { DeliveriesList } from './modules/deliveries/DeliveriesList';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { EmployeesPage } from './modules/employees/EmployeesPage';

export function App() {
  const { isAuthenticated, setUser } = useAuthStore();
  const { theme, language } = useUIStore();

  // Apply dark/light class synchronously before first paint
  // (useEffect runs too late — causes a flash of wrong theme)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }

  // DEV: Auto-login – remove this block to restore the login screen
  useEffect(() => {
    if (!isAuthenticated) {
      api.auth.login('admin', 'admin123')
        .then(setUser)
        .catch(() =>
          setUser({
            id: 'dev',
            name: 'أحمد المدير',
            username: 'admin',
            role: 'owner',
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        );
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [theme, language]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen font-arabic" style={{ background: '#0B0F1A' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-[3px] border-gold-400 border-t-transparent animate-spin"
            style={{ boxShadow: '0 0 14px rgba(201,168,76,0.23)' }} />
          <p className="text-white/40 text-sm">جاري تهيئة النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Homepage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="cleaning" element={<CleaningList />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="rentals" element={<RentalsList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="deliveries" element={<DeliveriesList />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="reminders" element={<RemindersList />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

