use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::Announcement};

#[tauri::command]
pub fn get_announcements(state: tauri::State<'_, AppState>) -> Result<Vec<Announcement>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, title, body, created_by, created_at FROM announcements ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Announcement {
            id:         row.get(0)?,
            title:      row.get(1)?,
            body:       row.get(2)?,
            created_by: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

#[tauri::command]
pub fn create_announcement(
    state: tauri::State<'_, AppState>,
    title: String,
    body: Option<String>,
    user_id: String,
) -> Result<Announcement, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    if title.trim().is_empty() {
        return Err("العنوان مطلوب".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO announcements (id, title, body, created_by, created_at) VALUES (?1,?2,?3,?4,?5)",
        params![id, title.trim(), body, user_id, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("إعلان جديد: {}", title.trim());
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "create_announcement",
        entity_type: "announcement",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Announcement { id, title: title.trim().to_string(), body, created_by: user_id, created_at: now })
}

#[tauri::command]
pub fn delete_announcement(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    db.execute("DELETE FROM announcements WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_announcement",
        entity_type: "announcement",
        entity_id: Some(&id),
        description: "حذف إعلان",
        metadata: None,
    });

    Ok(())
}
