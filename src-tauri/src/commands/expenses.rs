use rusqlite::params;
use uuid::Uuid;
use chrono::{Utc, NaiveDate, Datelike};
use crate::{AppState, models::*};

fn compute_next_due(from: &str, recurring_type: &str) -> Option<String> {
    use chrono::Datelike;
    let date = NaiveDate::parse_from_str(from, "%Y-%m-%d").ok()?;
    let next = match recurring_type {
        "monthly" => {
            let (y, m, d) = (date.year(), date.month(), date.day());
            let (ny, nm) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
            NaiveDate::from_ymd_opt(ny, nm, d)
                .or_else(|| NaiveDate::from_ymd_opt(ny, nm, 28))?
        }
        "weekly" => {
            // Advance to next Sunday (week starts Sunday)
            // num_days_from_sunday: Sun=0, Mon=1, …, Sat=6
            let days_from_sun = date.weekday().num_days_from_sunday() as i64;
            let until_next_sun = if days_from_sun == 0 { 7 } else { 7 - days_from_sun };
            date + chrono::Duration::days(until_next_sun)
        }
        _ => return None,
    };
    Some(next.format("%Y-%m-%d").to_string())
}

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
    let is_template: i64 = if input.recurring_type != "none" { 1 } else { 0 };
    let next_due = if input.recurring_type != "none" {
        compute_next_due(&input.date, &input.recurring_type)
    } else {
        None
    };

    db.execute(
        "INSERT INTO expenses (id,category,amount,description,date,recurring_type,employee_id,usd_to_syp_snapshot,currency,usd_to_try_snapshot,is_template,next_due_date,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13)",
        params![id, input.category, input.amount, input.description, input.date, input.recurring_type, input.employee_id, snapshot, currency, try_snapshot, is_template, next_due, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("مصروف جديد: {} — {} {}", input.category, input.amount, currency);
    let meta = serde_json::json!({
        "category": input.category, "amount": input.amount,
        "currency": currency, "date": input.date
    }).to_string();
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.employee_id.as_deref(),
        user_name: None,
        action: "create_expense",
        entity_type: "expense",
        entity_id: Some(&id),
        description: &desc,
        metadata: Some(&meta),
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

    let update_meta = serde_json::json!({
        "category": category, "amount": amount, "date": date
    }).to_string();
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "update_expense",
        entity_type: "expense",
        entity_id: Some(&id),
        description: &format!("تم تعديل المصروف: {} — {} {}", category, amount, date),
        metadata: Some(&update_meta),
    });

    Ok(())
}

#[tauri::command]
pub fn generate_recurring_expenses(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let today = chrono::Local::now().date_naive().format("%Y-%m-%d").to_string();
    let mut total_generated: i64 = 0;

    // Loop: keep generating until all missed periods are caught up
    loop {
        #[allow(clippy::type_complexity)]
        let due: Vec<(String, String, f64, Option<String>, String, String, Option<String>, f64, String, f64)> = {
            let mut stmt = db.prepare(
                "SELECT id, category, amount, description, next_due_date, recurring_type,
                        employee_id, usd_to_syp_snapshot, currency, usd_to_try_snapshot
                 FROM expenses
                 WHERE is_template = 1 AND recurring_type != 'none'
                   AND next_due_date IS NOT NULL AND next_due_date <= ?1"
            ).map_err(|e| e.to_string())?;

            let rows = stmt.query_map(params![today], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, f64>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, f64>(9)?,
                ))
            }).map_err(|e| e.to_string())?;
            let collected: Vec<_> = rows.filter_map(|r| r.ok()).collect();
            collected
        };

        if due.is_empty() { break; }

        let now = Utc::now().to_rfc3339();
        for (parent_id, category, amount, description, due_date, recurring_type,
             employee_id, syp_snapshot, currency, try_snapshot) in due
        {
            let new_id = Uuid::new_v4().to_string();
            db.execute(
                "INSERT INTO expenses (id,category,amount,description,date,recurring_type,employee_id,
                          usd_to_syp_snapshot,currency,usd_to_try_snapshot,is_template,next_due_date,created_at,updated_at)
                 VALUES (?1,?2,?3,?4,?5,'none',?6,?7,?8,?9,0,NULL,?10,?10)",
                params![new_id, category, amount, description, due_date, employee_id,
                        syp_snapshot, currency, try_snapshot, now],
            ).map_err(|e| e.to_string())?;

            let next = compute_next_due(&due_date, &recurring_type);
            db.execute(
                "UPDATE expenses SET next_due_date = ?1 WHERE id = ?2",
                params![next, parent_id],
            ).map_err(|e| e.to_string())?;

            total_generated += 1;
        }
    }

    Ok(total_generated)
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
