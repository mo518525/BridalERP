use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_activity_log(state: tauri::State<'_, AppState>, limit: Option<i64>) -> Result<Vec<ActivityLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);
    let mut stmt = db.prepare(
        "SELECT id,user_id,user_name,action,entity_type,entity_id,description,metadata,created_at
         FROM activity_log ORDER BY created_at DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map(params![limit], |row| {
        Ok(ActivityLog {
            id: row.get(0)?, user_id: row.get(1)?, user_name: row.get(2)?,
            action: row.get(3)?, entity_type: row.get(4)?, entity_id: row.get(5)?,
            description: row.get(6)?, metadata: row.get(7)?, created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok()).collect();
    Ok(items)
}

#[tauri::command]
pub fn log_activity(state: tauri::State<'_, AppState>, input: LogActivityInput) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,description,metadata,created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![id, input.user_id, None::<String>, input.action, input.entity_type, input.entity_id, input.description, input.metadata, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
