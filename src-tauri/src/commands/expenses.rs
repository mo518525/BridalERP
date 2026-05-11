use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

fn validate_recurring_type(r: &str) -> Result<(), String> {
    if !["none", "monthly", "weekly"].contains(&r) {
        return Err("نوع التكرار غير صحيح (none/monthly/weekly)".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn get_expenses(
    state: tauri::State<'_, AppState>,
    filter: Option<FilterParams>,
) -> Result<Vec<Expense>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec!["1=1".to_string()];
    let mut param_values: Vec<String> = vec![];

    if let Some(f) = filter {
        if let Some(cat) = f.category {
            if !cat.trim().is_empty() {
                conditions.push("category = ?".to_string());
                param_values.push(cat);
            }
        }
        if let Some(df) = f.date_from {
            if !df.trim().is_empty() {
                conditions.push("date >= ?".to_string());
                param_values.push(df);
            }
        }
        if let Some(dt) = f.date_to {
            if !dt.trim().is_empty() {
                conditions.push("date <= ?".to_string());
                param_values.push(dt);
            }
        }
        if let Some(s) = f.search {
            if !s.trim().is_empty() {
                conditions.push(
                    "(LOWER(COALESCE(description, '')) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?) OR LOWER(recurring_type) LIKE LOWER(?) OR date LIKE ? OR CAST(amount AS TEXT) LIKE ?)"
                        .to_string(),
                );
                let like_value = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
                param_values.push(like_value.clone());
                param_values.push(like_value.clone());
                param_values.push(like_value.clone());
                param_values.push(like_value.clone());
                param_values.push(like_value);
            }
        }
        if let Some(rt) = f.recurring_type {
            if !rt.trim().is_empty() {
                conditions.push("recurring_type = ?".to_string());
                param_values.push(rt);
            }
        }
    }

    let query = format!(
        "SELECT id, category, amount, description, date, recurring_type, employee_id,
                usd_to_syp_snapshot, currency, usd_to_try_snapshot, created_at, updated_at
         FROM expenses WHERE {} ORDER BY date DESC, created_at DESC",
        conditions.join(" AND ")
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        param_values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Expense {
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

    Ok(result)
}

#[tauri::command]
pub fn create_expense(state: tauri::State<'_, AppState>, input: CreateExpenseInput) -> Result<Expense, String> {
    crate::validation::validate_expense_category(&input.category)?;
    if input.amount <= 0.0 {
        return Err("المبلغ يجب أن يكون أكبر من صفر".to_string());
    }
    crate::validation::validate_not_empty(&input.date, "التاريخ")?;
    validate_recurring_type(&input.recurring_type)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let snapshot = if input.usd_to_syp_snapshot > 0.0 { input.usd_to_syp_snapshot } else { 14000.0 };
    let try_snapshot = if input.usd_to_try_snapshot > 0.0 { input.usd_to_try_snapshot } else { 34.0 };
    let currency = if input.currency.trim().is_empty() { "SYP".to_string() } else { input.currency.clone() };

    db.execute(
        "INSERT INTO expenses (id,category,amount,description,date,recurring_type,employee_id,usd_to_syp_snapshot,currency,usd_to_try_snapshot,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11)",
        params![id, input.category, input.amount, input.description, input.date, input.recurring_type, input.employee_id, snapshot, currency, try_snapshot, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("مصروف جديد: {} — {} {}", input.category, input.amount, currency);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.employee_id.as_deref(),
        user_name: None,
        action: "create_expense",
        entity_type: "expense",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Expense {
        id, category: input.category, amount: input.amount, description: input.description,
        date: input.date, recurring_type: input.recurring_type, employee_id: input.employee_id,
        usd_to_syp_snapshot: snapshot, usd_to_try_snapshot: try_snapshot,
        currency, created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn update_expense(
    state: tauri::State<'_, AppState>,
    id: String,
    category: String,
    amount: f64,
    description: Option<String>,
    date: String,
    recurring_type: String,
    user_id: Option<String>,
) -> Result<(), String> {
    crate::validation::validate_expense_category(&category)?;
    if amount <= 0.0 {
        return Err("المبلغ يجب أن يكون أكبر من صفر".to_string());
    }
    crate::validation::validate_not_empty(&date, "التاريخ")?;
    validate_recurring_type(&recurring_type)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE expenses SET category=?1,amount=?2,description=?3,date=?4,recurring_type=?5,updated_at=?6 WHERE id=?7",
        params![category, amount, description, date, recurring_type, now, id],
    ).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "update_expense",
        entity_type: "expense",
        entity_id: Some(&id),
        description: &format!("تم تعديل المصروف: {} — {} ر.س", category, amount),
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn delete_expense(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    db.execute("DELETE FROM expenses WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_expense",
        entity_type: "expense",
        entity_id: Some(&id),
        description: "تم حذف المصروف",
        metadata: None,
    });

    Ok(())
}
