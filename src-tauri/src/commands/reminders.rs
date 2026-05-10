use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_reminders(
    state: tauri::State<'_, AppState>,
    status: Option<String>,
    reminder_type: Option<String>,
) -> Result<Vec<Reminder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec!["1=1".to_string()];
    let mut param_values: Vec<String> = vec![];

    let status_val = status.unwrap_or_default();
    let status_filter = if status_val.trim().is_empty() { "pending".to_string() } else { status_val.trim().to_string() };
    conditions.push("r.status = ?".to_string());
    param_values.push(status_filter);
    if let Some(rt) = reminder_type {
        if !rt.trim().is_empty() {
            conditions.push("r.reminder_type = ?".to_string());
            param_values.push(rt);
        }
    }

    let query = format!(
        "SELECT r.id,r.reminder_type,r.title,r.description,r.date,r.priority,r.status,r.transaction_id,
                c.name,r.created_at,r.updated_at,d.code
         FROM reminders r
         LEFT JOIN transactions t ON t.id=r.transaction_id
         LEFT JOIN customers c ON c.id=t.customer_id
         LEFT JOIN dresses d ON d.id=t.dress_id
         WHERE {} ORDER BY r.date ASC, r.priority DESC",
        conditions.join(" AND ")
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        param_values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let items = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Reminder {
            id: row.get(0)?, reminder_type: row.get(1)?, title: row.get(2)?,
            description: row.get(3)?, date: row.get(4)?, priority: row.get(5)?,
            status: row.get(6)?, transaction_id: row.get(7)?, customer_name: row.get(8)?,
            created_at: row.get(9)?, updated_at: row.get(10)?, dress_code: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok()).collect();
    Ok(items)
}

#[tauri::command]
pub fn create_reminder(state: tauri::State<'_, AppState>, input: CreateReminderInput) -> Result<Reminder, String> {
    crate::validation::validate_reminder_type(&input.reminder_type)?;
    crate::validation::validate_reminder_priority(&input.priority)?;
    crate::validation::validate_not_empty(&input.date, "التاريخ")?;
    crate::validation::validate_not_empty(&input.title, "العنوان")?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,'pending',?7,?8,?8)",
        params![id, input.reminder_type, input.title, input.description, input.date, input.priority, input.transaction_id, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("تذكير جديد: {}", input.title);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: None,
        user_name: None,
        action: "create_reminder",
        entity_type: "reminder",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Reminder {
        id, reminder_type: input.reminder_type, title: input.title, description: input.description,
        date: input.date, priority: input.priority, status: "pending".to_string(),
        transaction_id: input.transaction_id, customer_name: None, dress_code: None,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn mark_reminder_done(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM reminders WHERE id=?1", params![id]).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: None,
        user_name: None,
        action: "reminder_done",
        entity_type: "reminder",
        entity_id: Some(&id),
        description: "تم إنهاء التذكير وحذفه",
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn delete_reminder(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    db.execute("DELETE FROM reminders WHERE id=?1", params![id]).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_reminder",
        entity_type: "reminder",
        entity_id: Some(&id),
        description: "تم حذف التذكير",
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn update_reminder(state: tauri::State<'_, AppState>, id: String, date: String, priority: String, status: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE reminders SET date=?1, priority=?2, status=?3, updated_at=?4 WHERE id=?5",
        params![date, priority, status, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
