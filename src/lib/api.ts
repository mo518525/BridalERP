import { invoke as _tauriInvoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../store/authStore';

// Safe wrapper — gives a clear error instead of "Cannot read properties of undefined"
// when the code runs outside the Tauri webview (e.g. plain `npm run dev`).
function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === 'undefined' || !(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__) {
    return Promise.reject(new Error('التطبيق يعمل خارج بيئة Tauri.\nشغّل التطبيق بـ: npm run tauri dev'));
  }
  return _tauriInvoke<T>(cmd, args);
}
import type {
  User, Dress, Customer, Transaction, Expense,
  Reminder, ActivityLog, Delivery, DashboardStats,
  FinancialReport, FilterParams, HomeSummary, CalendarEvent,
  RecurringType, Announcement, EmployeeTodo,
} from '../types';

// Returns current logged-in user's ID. Throws if not authenticated.
function getCurrentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('غير مسجل الدخول');
  return user.id;
}

export type CreateUserInput = {
  name: string; username: string; password: string; role: string;
};
export type CreateDressInput = {
  code: string; color?: string; size?: string; style?: string;
  price: number; notes?: string; image_path?: string;
};
export type UpdateDressInput = {
  id: string; code?: string; color?: string; size?: string; style?: string;
  price?: number; notes?: string; image_path?: string;
};
export type CreateCustomerInput = {
  name: string; phone?: string; address?: string; notes?: string;
};
export type CreateSaleInput = {
  customer_id: string; dress_id: string; price: number; deposit: number;
  payment_method: string; pickup_date?: string; phone?: string;
  notes?: string; employee_id?: string;
  currency?: string; exchange_rate_to_syp?: number;
  usd_to_syp_snapshot?: number; usd_to_try_snapshot?: number;
};
export type CreateRentalInput = {
  customer_id: string; dress_id: string; price: number; deposit: number;
  payment_method: string; rental_start: string; rental_end: string;
  phone?: string; notes?: string; employee_id?: string;
  currency?: string; exchange_rate_to_syp?: number;
  usd_to_syp_snapshot?: number; usd_to_try_snapshot?: number;
};
export type ProcessReturnInput = {
  transaction_id: string; needs_cleaning: boolean; cleaner_name?: string; notes?: string;
};
export type CreateExpenseInput = {
  category: string; amount: number; currency: string; description?: string;
  date: string; recurring_type: RecurringType; employee_id?: string;
  usd_to_syp_snapshot: number; usd_to_try_snapshot: number;
};
export type CreateReminderInput = {
  reminder_type: string; title: string; description?: string;
  date: string; priority: string; transaction_id?: string;
};
export type LogActivityInput = {
  user_id?: string; action: string; entity_type: string;
  entity_id?: string; description: string; metadata?: string;
};
export type CreateDeliveryInput = {
  delivery_number: string; supplier?: string; delivery_date: string;
  total_cost: number; notes?: string; dress_ids: string[];
};

export const api = {
  auth: {
    login: (username: string, password: string) =>
      invoke<User>('login', { input: { username, password } }),
    getUsers: () =>
      invoke<User[]>('get_users', { userId: getCurrentUserId() }),
    createUser: (input: CreateUserInput) =>
      invoke<User>('create_user', { input, userId: getCurrentUserId() }),
    updateUser: (id: string, name: string, role: string, active: boolean, password?: string) =>
      invoke<void>('update_user', { id, name, role, active, password, userId: getCurrentUserId() }),
    deleteUser: (id: string) =>
      invoke<void>('delete_user', { id, userId: getCurrentUserId() }),
    changeOwnPassword: (oldPassword: string, newPassword: string) =>
      invoke<void>('change_own_password', { userId: getCurrentUserId(), oldPassword, newPassword }),
    getQuranVerse: () => invoke<[string, string]>('get_quran_verse'),
  },

  inventory: {
    getAll: (filter?: FilterParams) => invoke<Dress[]>('get_dresses', { filter }),
    getOne: (id: string) => invoke<Dress>('get_dress', { id }),
    getNextCode: () => invoke<string>('get_next_dress_code'),
    create: (input: CreateDressInput) => invoke<Dress>('create_dress', { input }),
    update: (input: UpdateDressInput) => invoke<void>('update_dress', { input }),
    updateStatus: (dress_id: string, status: string) =>
      invoke<void>('update_dress_status', { dress_id, status }),
    delete: (id: string) =>
      invoke<void>('delete_dress', { id, userId: getCurrentUserId() }),
    getHistory: (dress_id: string) => invoke<Transaction[]>('get_dress_history', { dress_id }),
  },

  transactions: {
    getAll: (filter?: FilterParams) => invoke<Transaction[]>('get_transactions', { filter }),
    getOne: (id: string) => invoke<Transaction>('get_transaction', { id }),
    createSale: (input: CreateSaleInput) => invoke<Transaction>('create_sale', { input }),
    createRental: (input: CreateRentalInput) => invoke<Transaction>('create_rental', { input }),
    processReturn: (input: ProcessReturnInput) => invoke<void>('process_return', { input }),
    markCleaningDone: (dress_id: string) =>
      invoke<void>('mark_cleaning_done', { dressId: dress_id }),
    complete: (id: string, amount_paid: number) =>
      invoke<void>('complete_transaction', { id, amountPaid: amount_paid }),
    cancel: (id: string) => invoke<void>('cancel_transaction', { id }),
    reserve: (dress_id: string, customer_id: string, notes?: string) =>
      invoke<void>('reserve_dress', { dress_id, customer_id, notes }),
  },

  customers: {
    getAll: (search?: string) => invoke<Customer[]>('get_customers', { search }),
    getOne: (id: string) => invoke<Customer>('get_customer', { id }),
    create: (input: CreateCustomerInput) => invoke<Customer>('create_customer', { input }),
    update: (id: string, name: string, phone?: string, address?: string, notes?: string) =>
      invoke<void>('update_customer', { id, name, phone, address, notes }),
    delete: (id: string) =>
      invoke<void>('delete_customer', { id, userId: getCurrentUserId() }),
    getHistory: (customer_id: string) =>
      invoke<Transaction[]>('get_customer_history', { customer_id }),
  },

  expenses: {
    getAll: (filter?: FilterParams) => invoke<Expense[]>('get_expenses', { filter }),
    create: (input: CreateExpenseInput) => invoke<Expense>('create_expense', { input }),
    update: (id: string, category: string, amount: number, description: string | undefined, date: string, recurring_type: RecurringType) =>
      invoke<void>('update_expense', { id, category, amount, description, date, recurringType: recurring_type }),
    delete: (id: string) =>
      invoke<void>('delete_expense', { id, userId: getCurrentUserId() }),
  },

  reminders: {
    getAll: (status?: string, reminder_type?: string) =>
      invoke<Reminder[]>('get_reminders', { status, reminderType: reminder_type }),
    create: (input: CreateReminderInput) => invoke<Reminder>('create_reminder', { input }),
    markDone: (id: string) => invoke<void>('mark_reminder_done', { id }),
    delete: (id: string) =>
      invoke<void>('delete_reminder', { id, userId: getCurrentUserId() }),
    update: (id: string, date: string, priority: string, status: string) =>
      invoke<void>('update_reminder', { id, date, priority, status }),
  },

  activity: {
    getLog: (limit?: number) => invoke<ActivityLog[]>('get_activity_log', { limit }),
    log: (input: LogActivityInput) => invoke<void>('log_activity', { input }),
  },

  reports: {
    getDashboardStats: () =>
      invoke<DashboardStats>('get_dashboard_stats', { userId: getCurrentUserId() }),
    getFinancialReport: (date_from: string, date_to: string) =>
      invoke<FinancialReport>('get_financial_report', { dateFrom: date_from, dateTo: date_to, userId: getCurrentUserId() }),
    getInventoryReport: () => invoke<Record<string, unknown>>('get_inventory_report'),
  },

  deliveries: {
    getAll: () => invoke<Delivery[]>('get_deliveries'),
    getNextNumber: () => invoke<string>('get_next_delivery_number'),
    getDresses: (deliveryId: string) => invoke<Dress[]>('get_delivery_dresses', { deliveryId }),
    addDress: (deliveryId: string, dressId: string) =>
      invoke<void>('add_dress_to_delivery', { deliveryId, dressId }),
    create: (input: CreateDeliveryInput) => invoke<Delivery>('create_delivery', { input }),
    delete: (id: string) =>
      invoke<void>('delete_delivery', { id, userId: getCurrentUserId() }),
  },

  home: {
    getSummary: () => invoke<HomeSummary>('get_home_summary'),
  },

  calendar: {
    getEvents: (date_from: string, date_to: string) =>
      invoke<CalendarEvent[]>('get_calendar_events', { dateFrom: date_from, dateTo: date_to }),
  },

  announcements: {
    getAll: () => invoke<Announcement[]>('get_announcements'),
    create: (title: string, body?: string) =>
      invoke<Announcement>('create_announcement', { title, body, userId: getCurrentUserId() }),
    delete: (id: string) =>
      invoke<void>('delete_announcement', { id, userId: getCurrentUserId() }),
  },

  todos: {
    getAll: () => invoke<EmployeeTodo[]>('get_todos', { userId: getCurrentUserId() }),
    create: (text: string) =>
      invoke<EmployeeTodo>('create_todo', { userId: getCurrentUserId(), text }),
    toggle: (id: string) =>
      invoke<void>('toggle_todo', { id, userId: getCurrentUserId() }),
    delete: (id: string) =>
      invoke<void>('delete_todo', { id, userId: getCurrentUserId() }),
  },

  settings: {
    get: (key: string) => invoke<string | null>('get_setting', { key }),
    set: (key: string, value: string) =>
      invoke<void>('set_setting', { userId: getCurrentUserId(), key, value }),
    backup: () => invoke<string>('backup_database', { userId: getCurrentUserId() }),
    activateLicense: (key: string) =>
      invoke<void>('activate_license', { userId: getCurrentUserId(), key }),
  },

  exports: {
    saveToDownloads: (filename: string, content: string) =>
      invoke<string>('save_to_downloads', { filename, content }),
    savePdfToDownloads: (html_content: string, filename: string) =>
      invoke<string>('save_pdf_to_downloads', { htmlContent: html_content, filename }),
  },
};
