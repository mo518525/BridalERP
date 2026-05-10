use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::EmployeeTodo};

#[tauri::command]
pub fn get_todos(state: tauri::State<'_, AppState>, user_id: String) -> Result<Vec<EmployeeTodo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, user_id, text, done, created_at FROM employee_todos WHERE user_id=?1 ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![user_id], |row| {
        Ok(EmployeeTodo {
            id:         row.get(0)?,
            user_id:    row.get(1)?,
            text:       row.get(2)?,
            done:       row.get::<_, i64>(3)? != 0,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

#[tauri::command]
pub fn create_todo(
    state: tauri::State<'_, AppState>,
    user_id: String,
    text: String,
) -> Result<EmployeeTodo, String> {
    if text.trim().is_empty() {
        return Err("نص المهمة مطلوب".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO employee_todos (id, user_id, text, done, created_at) VALUES (?1,?2,?3,0,?4)",
        params![id, user_id, text.trim(), now],
    ).map_err(|e| e.to_string())?;

    Ok(EmployeeTodo { id, user_id, text: text.trim().to_string(), done: false, created_at: now })
}

#[tauri::command]
pub fn toggle_todo(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE employee_todos SET done = 1 - done WHERE id=?1 AND user_id=?2",
        params![id, user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_todo(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM employee_todos WHERE id=?1 AND user_id=?2",
        params![id, user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
