use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub username: String,
    pub role: String,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserInput {
    pub name: String,
    pub username: String,
    pub password: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dress {
    pub id: String,
    pub code: String,
    pub status: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub style: Option<String>,
    pub price: f64,
    pub notes: Option<String>,
    pub image_path: Option<String>,
    pub cleaner_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDressInput {
    pub code: String,
    pub color: Option<String>,
    pub size: Option<String>,
    pub style: Option<String>,
    pub price: f64,
    pub notes: Option<String>,
    pub image_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDressInput {
    pub id: String,
    pub code: Option<String>,
    pub color: Option<String>,
    pub size: Option<String>,
    pub style: Option<String>,
    pub price: Option<f64>,
    pub notes: Option<String>,
    pub image_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerInput {
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub transaction_type: String,
    pub customer_id: String,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
    pub dress_id: String,
    pub dress_code: Option<String>,
    pub dress_size: Option<String>,
    pub price: f64,
    pub deposit: f64,
    pub remaining: f64,
    pub payment_method: String,
    pub status: String,
    pub rental_start: Option<String>,
    pub rental_end: Option<String>,
    pub return_date: Option<String>,
    pub employee_id: Option<String>,
    pub notes: Option<String>,
    pub currency: String,
    pub exchange_rate_to_syp: f64,
    pub usd_to_syp_snapshot: f64,
    pub usd_to_try_snapshot: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleInput {
    pub customer_id: String,
    pub dress_id: String,
    pub price: f64,
    pub deposit: f64,
    pub payment_method: String,
    pub pickup_date: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub employee_id: Option<String>,
    pub currency: Option<String>,
    pub exchange_rate_to_syp: Option<f64>,
    pub usd_to_syp_snapshot: Option<f64>,
    pub usd_to_try_snapshot: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRentalInput {
    pub customer_id: String,
    pub dress_id: String,
    pub price: f64,
    pub deposit: f64,
    pub payment_method: String,
    pub rental_start: String,
    pub rental_end: String,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub employee_id: Option<String>,
    pub currency: Option<String>,
    pub exchange_rate_to_syp: Option<f64>,
    pub usd_to_syp_snapshot: Option<f64>,
    pub usd_to_try_snapshot: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessReturnInput {
    pub transaction_id: String,
    pub needs_cleaning: bool,
    pub cleaner_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    pub id: String,
    pub category: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    pub date: String,
    pub recurring_type: String,
    pub employee_id: Option<String>,
    pub usd_to_syp_snapshot: f64,
    pub usd_to_try_snapshot: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateExpenseInput {
    pub category: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    pub date: String,
    pub recurring_type: String,
    pub employee_id: Option<String>,
    pub usd_to_syp_snapshot: f64,
    pub usd_to_try_snapshot: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Reminder {
    pub id: String,
    pub reminder_type: String,
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub priority: String,
    pub status: String,
    pub transaction_id: Option<String>,
    pub customer_name: Option<String>,
    pub dress_code: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReminderInput {
    pub reminder_type: String,
    pub title: String,
    pub description: Option<String>,
    pub date: String,
    pub priority: String,
    pub transaction_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLog {
    pub id: String,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub description: String,
    pub metadata: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogActivityInput {
    pub user_id: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub description: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardStats {
    pub total_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub total_sales: i64,
    pub total_rentals: i64,
    pub active_rentals: i64,
    pub available_dresses: i64,
    pub rented_dresses: i64,
    pub sold_dresses: i64,
    pub cleaning_dresses: i64,
    pub reserved_dresses: i64,
    pub pending_payments: f64,
    pub today_revenue: f64,
    pub today_transactions: i64,
    pub upcoming_returns: i64,
    pub overdue_returns: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FinancialReport {
    pub period_start: String,
    pub period_end: String,
    pub total_revenue: f64,
    pub sale_revenue: f64,
    pub rental_revenue: f64,
    pub total_expenses: f64,
    pub net_profit: f64,
    pub transactions: Vec<Transaction>,
    pub expenses: Vec<Expense>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilterParams {
    pub search: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub category: Option<String>,
    pub recurring_type: Option<String>,
    pub reminder_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Delivery {
    pub id: String,
    pub delivery_number: String,
    pub supplier: Option<String>,
    pub delivery_date: String,
    pub total_cost: f64,
    pub notes: Option<String>,
    pub item_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDeliveryInput {
    pub delivery_number: String,
    pub supplier: Option<String>,
    pub delivery_date: String,
    pub total_cost: f64,
    pub notes: Option<String>,
    pub dress_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarEvent {
    pub id: String,
    pub event_type: String,
    pub title: String,
    pub date: String,
    pub entity_id: String,
    pub customer_name: Option<String>,
    pub dress_code: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HomeSummary {
    pub pending_reminders: i64,
    pub overdue_returns: i64,
    pub active_rentals: i64,
    pub pending_payments: f64,
    pub available_dresses: i64,
    pub cleaning_dresses: i64,
    pub today_revenue: f64,
    pub today_transactions: i64,
}
