// src-tauri/src/commands/home.rs
use rusqlite::params;
use crate::{AppState, models::HomeSummary};

#[tauri::command]
pub fn get_home_summary(state: tauri::State<'_, AppState>) -> Result<HomeSummary, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let pending_reminders: i64 = db.query_row(
        "SELECT COUNT(*) FROM reminders WHERE status = 'pending'",
        [], |r| r.get(0),
    ).unwrap_or(0);

    let overdue_returns: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions
         WHERE transaction_type = 'rental' AND status = 'active' AND DATE(rental_end) < ?1",
        params![today], |r| r.get(0),
    ).unwrap_or(0);

    let active_rentals: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type = 'rental' AND status = 'active'",
        [], |r| r.get(0),
    ).unwrap_or(0);

    let pending_payments: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            remaining /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions WHERE status = 'active' AND remaining > 0",
        [], |r| r.get(0),
    ).unwrap_or(0.0);

    let available_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status = 'available'",
        [], |r| r.get(0),
    ).unwrap_or(0);

    let cleaning_dresses: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE status = 'cleaning'",
        [], |r| r.get(0),
    ).unwrap_or(0);

    let today_revenue: f64 = db.query_row(
        "SELECT COALESCE(SUM(
            deposit /
            CASE currency
                WHEN 'USD' THEN 1.0
                WHEN 'TRY' THEN NULLIF(usd_to_try_snapshot, 0)
                ELSE NULLIF(usd_to_syp_snapshot, 0)
            END
        ), 0) FROM transactions WHERE DATE(created_at) = ?1",
        params![today], |r| r.get(0),
    ).unwrap_or(0.0);

    let today_transactions: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = ?1",
        params![today], |r| r.get(0),
    ).unwrap_or(0);

    Ok(HomeSummary {
        pending_reminders,
        overdue_returns,
        active_rentals,
        pending_payments,
        available_dresses,
        cleaning_dresses,
        today_revenue,
        today_transactions,
    })
}
