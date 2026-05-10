export type Role = 'owner' | 'employee' | 'cashier';
export type DressStatus = 'available' | 'reserved' | 'rented' | 'cleaning' | 'sold';
export type TransactionType = 'sale' | 'rental';
export type TransactionStatus = 'active' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer';
export type ReminderType = 'pickup' | 'return' | 'payment' | 'cleaning';
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ReminderStatus = 'pending' | 'done' | 'cancelled';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dress {
  id: string;
  code: string;
  status: DressStatus;
  color?: string;
  size?: string;
  style?: string;
  price: number;
  notes?: string;
  image_path?: string;
  cleaner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  dress_id: string;
  dress_code?: string;
  dress_size?: string;
  price: number;
  deposit: number;
  remaining: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  rental_start?: string;
  rental_end?: string;
  return_date?: string;
  employee_id?: string;
  notes?: string;
  currency: string;
  exchange_rate_to_syp: number;
  usd_to_syp_snapshot: number;
  usd_to_try_snapshot: number;
  created_at: string;
  updated_at: string;
}

export type RecurringType = 'none' | 'monthly' | 'weekly';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  recurring_type: RecurringType;
  employee_id?: string;
  usd_to_syp_snapshot: number;
  usd_to_try_snapshot: number;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  reminder_type: ReminderType;
  title: string;
  description?: string;
  date: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  transaction_id?: string;
  customer_name?: string;
  dress_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata?: string;
  created_at: string;
}

export interface Delivery {
  id: string;
  delivery_number: string;
  supplier?: string;
  delivery_date: string;
  total_cost: number;
  notes?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_sales: number;
  total_rentals: number;
  active_rentals: number;
  available_dresses: number;
  rented_dresses: number;
  sold_dresses: number;
  cleaning_dresses: number;
  reserved_dresses: number;
  pending_payments: number;
  today_revenue: number;
  today_transactions: number;
  upcoming_returns: number;
  overdue_returns: number;
}

export interface FinancialReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  sale_revenue: number;
  rental_revenue: number;
  total_expenses: number;
  net_profit: number;
  transactions: Transaction[];
  expenses: Expense[];
}

export interface FilterParams {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  recurring_type?: RecurringType;
}

export const EXPENSE_CATEGORIES = ['rent', 'electricity', 'salary', 'cleaning', 'marketing', 'maintenance', 'other'] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const DRESS_SIZES = ['30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60'] as const;
export const DRESS_COLORS_AR = ['أبيض', 'كريمي', 'ذهبي', 'وردي', 'أحمر', 'أزرق', 'أخضر', 'بيج', 'فضي', 'أسود', 'أرجواني'] as const;
export const DRESS_STYLES_AR = ['كلاسيكي', 'حديث', 'أميرة', 'بوهيمي', 'رومانسي', 'شيك', 'فاخر'] as const;

export interface HomeSummary {
  pending_reminders: number;
  overdue_returns: number;
  active_rentals: number;
  pending_payments: number;
  available_dresses: number;
  cleaning_dresses: number;
  today_revenue: number;
  today_transactions: number;
}

export interface CalendarEvent {
  id: string;
  event_type: 'rental_start' | 'rental_end' | 'payment' | 'cleaning' | 'delivery';
  title: string;
  date: string;
  entity_id: string;
  customer_name?: string;
  dress_code?: string;
  priority?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body?: string;
  created_by: string;
  created_at: string;
}

export interface EmployeeTodo {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  created_at: string;
}
