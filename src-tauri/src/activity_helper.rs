use rusqlite::{Connection, params};
use uuid::Uuid;
use chrono::Utc;

pub struct ActivityEntry<'a> {
    pub user_id: Option<&'a str>,
    pub user_name: Option<&'a str>,
    pub action: &'a str,
    pub entity_type: &'a str,
    pub entity_id: Option<&'a str>,
    pub description: &'a str,
    pub metadata: Option<&'a str>,
}

pub fn log_activity(db: &Connection, entry: ActivityEntry<'_>) {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Resolve display name from user_id if not explicitly provided
    let resolved_name: Option<String> = if entry.user_name.is_some() {
        entry.user_name.map(|s| s.to_string())
    } else if let Some(uid) = entry.user_id {
        db.query_row(
            "SELECT name FROM users WHERE id = ?1",
            params![uid],
            |r| r.get::<_, String>(0),
        ).ok()
    } else {
        None
    };

    let _ = db.execute(
        "INSERT INTO activity_log (id, user_id, user_name, action, entity_type, entity_id, description, metadata, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            entry.user_id,
            resolved_name,
            entry.action,
            entry.entity_type,
            entry.entity_id,
            entry.description,
            entry.metadata,
            now
        ],
    );
}
