import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { Login } from './modules/auth/Login';

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
  const { isAuthenticated } = useAuthStore();
  const { theme, language } = useUIStore();

  // Apply dark/light class synchronously before first paint
  // (useEffect runs too late — causes a flash of wrong theme)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [theme, language]);

  if (!isAuthenticated) {
    return <Login />;
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

