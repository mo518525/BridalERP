use rusqlite::params;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_dashboard_stats(state: tauri::State<'_, AppState>, user_id: String) -> Result<DashboardStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            (price - remaining) /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions WHERE status IN ('active','completed')",
        [], |r| r.get(0)
    ).unwrap_or(0.0);

    let total_expenses: f64 = db.query_row(
        "SELECT COALESCE(SUM(CASE
            WHEN currency='USD' THEN amount
            WHEN currency='TRY' THEN amount / NULLIF(usd_to_try_snapshot, 0)
            ELSE amount / NULLIF(usd_to_syp_snapshot, 0)
         END), 0) FROM expenses", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let total_sales: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='sale'", [], |r| r.get(0)
    ).unwrap_or(0);

    let total_rentals: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='rental'", [], |r| r.get(0)
    ).unwrap_or(0);

    let active_rentals: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='rental' AND status='active'", [], |r| r.get(0)
    ).unwrap_or(0);

    let available_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status='available'", [], |r| r.get(0)
    ).unwrap_or(0);

    let rented_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status='rented'", [], |r| r.get(0)
    ).unwrap_or(0);

    let sold_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status='sold'", [], |r| r.get(0)
    ).unwrap_or(0);

    let cleaning_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status='cleaning'", [], |r| r.get(0)
    ).unwrap_or(0);

    let reserved_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status='reserved'", [], |r| r.get(0)
    ).unwrap_or(0);

    let pending_payments: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            remaining /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions WHERE status='active' AND remaining > 0",
        [], |r| r.get(0)
    ).unwrap_or(0.0);

    let today_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            deposit /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions WHERE DATE(created_at)=?1",
        params![today], |r| r.get(0)
    ).unwrap_or(0.0);

    let today_transactions: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE DATE(created_at)=?1",
        params![today], |r| r.get(0)
    ).unwrap_or(0);

    let upcoming_returns: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='rental' AND status='active' AND DATE(rental_end) >= ?1",
        params![today], |r| r.get(0)
    ).unwrap_or(0);

    let overdue_returns: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='rental' AND status='active' AND DATE(rental_end) < ?1",
        params![today], |r| r.get(0)
    ).unwrap_or(0);

    Ok(DashboardStats {
        total_revenue,
        total_expenses,
        net_profit: total_revenue - total_expenses,
        total_sales,
        total_rentals,
        active_rentals,
        available_dresses,
        rented_dresses,
        sold_dresses,
        cleaning_dresses,
        reserved_dresses,
        pending_payments,
        today_revenue,
        today_transactions,
        upcoming_returns,
        overdue_returns,
    })
}

#[tauri::command]
pub fn get_financial_report(
    state: tauri::State<'_, AppState>,
    date_from: String,
    date_to: String,
    user_id: String,
) -> Result<FinancialReport, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;
    let date_to_end = format!("{}T23:59:59Z", date_to);

    let total_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            (price - remaining) /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions
         WHERE status IN ('active','completed') AND created_at BETWEEN ?1 AND ?2",
        params![date_from, date_to_end],
        |r| r.get(0),
    ).unwrap_or(0.0);

    let sale_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            (price - remaining) /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions
         WHERE transaction_type = 'sale' AND status IN ('active','completed') AND created_at BETWEEN ?1 AND ?2",
        params![date_from, date_to_end],
        |r| r.get(0),
    ).unwrap_or(0.0);

    let rental_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            (price - remaining) /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions
         WHERE transaction_type = 'rental' AND status IN ('active','completed') AND created_at BETWEEN ?1 AND ?2",
        params![date_from, date_to_end],
        |r| r.get(0),
    ).unwrap_or(0.0);

    let total_expenses: f64 = db.query_row(
        "SELECT COALESCE(SUM(CASE
            WHEN currency='USD' THEN amount
            WHEN currency='TRY' THEN amount / NULLIF(usd_to_try_snapshot, 0)
            ELSE amount / NULLIF(usd_to_syp_snapshot, 0)
         END), 0) FROM expenses WHERE date BETWEEN ?1 AND ?2",
        params![date_from, date_to],
        |r| r.get(0),
    ).unwrap_or(0.0);

    // Fetch actual transaction list
    let mut tx_stmt = db.prepare(
        "SELECT t.id, t.transaction_type, t.customer_id, c.name, c.phone, t.dress_id, d.code,
                t.price, t.deposit, t.remaining, t.payment_method, t.status,
                t.rental_start, t.rental_end, t.return_date, t.employee_id, t.notes,
                t.created_at, t.updated_at, d.size, t.currency, t.exchange_rate_to_syp, t.usd_to_syp_snapshot, t.usd_to_try_snapshot
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE t.status IN ('active','completed') AND t.created_at BETWEEN ?1 AND ?2
         ORDER BY t.created_at DESC",
    ).map_err(|e| e.to_string())?;

    let transactions: Vec<crate::models::Transaction> = tx_stmt
        .query_map(params![date_from, date_to_end], |row| {
            Ok(crate::models::Transaction {
                id: row.get(0)?, transaction_type: row.get(1)?,
                customer_id: row.get(2)?, customer_name: row.get(3)?,
                customer_phone: row.get(4)?,
                dress_id: row.get(5)?, dress_code: row.get(6)?, dress_size: row.get(19)?,
                price: row.get(7)?, deposit: row.get(8)?, remaining: row.get(9)?,
                payment_method: row.get(10)?, status: row.get(11)?,
                rental_start: row.get(12)?, rental_end: row.get(13)?,
                return_date: row.get(14)?, employee_id: row.get(15)?,
                pickup_date: None,
                notes: row.get(16)?, created_at: row.get(17)?, updated_at: row.get(18)?,
                currency: row.get::<_, Option<String>>(20)?.unwrap_or_else(|| "SYP".to_string()),
                exchange_rate_to_syp: row.get::<_, Option<f64>>(21)?.unwrap_or(1.0),
                usd_to_syp_snapshot: row.get::<_, Option<f64>>(22)?.unwrap_or(14000.0),
                usd_to_try_snapshot: row.get::<_, Option<f64>>(23)?.unwrap_or(34.0),
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Fetch actual expense list
    let mut exp_stmt = db.prepare(
        "SELECT id, category, amount, description, date, recurring_type, employee_id,
                usd_to_syp_snapshot, currency, usd_to_try_snapshot, created_at, updated_at
         FROM expenses WHERE date BETWEEN ?1 AND ?2 ORDER BY date DESC",
    ).map_err(|e| e.to_string())?;

    let expenses: Vec<crate::models::Expense> = exp_stmt
        .query_map(params![date_from, date_to], |row| {
            Ok(crate::models::Expense {
                id: row.get(0)?, category: row.get(1)?, amount: row.get(2)?,
                description: row.get(3)?, date: row.get(4)?,
                recurring_type: row.get::<_, Option<String>>(5)?.unwrap_or_else(|| "none".to_string()),
                employee_id: row.get(6)?,
                usd_to_syp_snapshot: row.get::<_, Option<f64>>(7)?.unwrap_or(14000.0),
                currency: row.get::<_, Option<String>>(8)?.unwrap_or_else(|| "SYP".to_string()),
                usd_to_try_snapshot: row.get::<_, Option<f64>>(9)?.unwrap_or(34.0),
                created_at: row.get(10)?, updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(FinancialReport {
        period_start: date_from,
        period_end: date_to,
        total_revenue,
        sale_revenue,
        rental_revenue,
        total_expenses,
        net_profit: total_revenue - total_expenses,
        transactions,
        expenses,
    })
}

#[tauri::command]
pub fn get_inventory_report(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let total: i64 = db.query_row("SELECT COUNT(*) FROM dresses", [], |r| r.get(0)).unwrap_or(0);
    let mut stmt = db.prepare(
        "SELECT status, COUNT(*) FROM dresses GROUP BY status"
    ).map_err(|e| e.to_string())?;
    let by_status: Vec<(String, i64)> = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let total_value: f64 = db.query_row(
        "SELECT COALESCE(SUM(purchase_price),0) FROM dresses", [], |r| r.get(0)
    ).unwrap_or(0.0);

    let by_status_map: serde_json::Value = by_status.iter().fold(
        serde_json::json!({}),
        |mut acc, (k, v)| { acc[k] = serde_json::json!(v); acc }
    );

    Ok(serde_json::json!({
        "total": total,
        "by_status": by_status_map,
        "total_inventory_value": total_value,
    }))
}
