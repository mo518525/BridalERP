use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*, utils::{hash_password, verify_password}};

#[tauri::command]
pub fn login(state: tauri::State<'_, AppState>, input: LoginInput) -> Result<User, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db.query_row(
        "SELECT id, name, username, password, role, active, created_at, updated_at FROM users WHERE username = ?1 AND active = 1",
        params![input.username],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, bool>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        },
    );

    match result {
        Ok((id, name, username, password_hash, role, active, created_at, updated_at)) => {
            if !verify_password(&input.password, &password_hash) {
                return Err("كلمة المرور غير صحيحة".to_string());
            }
            Ok(User { id, name, username, role, active, created_at, updated_at })
        }
        Err(_) => Err("اسم المستخدم غير موجود".to_string()),
    }
}

#[tauri::command]
pub fn get_users(state: tauri::State<'_, AppState>, user_id: String) -> Result<Vec<User>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    let mut stmt = db.prepare(
        "SELECT id, name, username, role, active, created_at, updated_at FROM users ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let users = stmt.query_map([], |row| {
        Ok(User {
            id: row.get(0)?,
            name: row.get(1)?,
            username: row.get(2)?,
            role: row.get(3)?,
            active: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(users)
}

#[tauri::command]
pub fn create_user(state: tauri::State<'_, AppState>, input: CreateUserInput, user_id: String) -> Result<User, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    crate::validation::validate_not_empty(&input.name, "الاسم")?;
    crate::validation::validate_not_empty(&input.username, "اسم المستخدم")?;
    crate::validation::validate_role(&input.role)?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let hashed = hash_password(&input.password);

    db.execute(
        "INSERT INTO users (id, name, username, password, role, active, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,1,?6,?7)",
        params![id, input.name, input.username, hashed, input.role, now, now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "اسم المستخدم موجود بالفعل".to_string()
        } else {
            e.to_string()
        }
    })?;

    Ok(User {
        id,
        name: input.name,
        username: input.username,
        role: input.role,
        active: true,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_user(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    role: String,
    active: bool,
    password: Option<String>,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    let now = Utc::now().to_rfc3339();

    if let Some(pwd) = password {
        let hashed = hash_password(&pwd);
        db.execute(
            "UPDATE users SET name=?1, role=?2, active=?3, password=?4, updated_at=?5 WHERE id=?6",
            params![name, role, active, hashed, now, id],
        ).map_err(|e| e.to_string())?;
    } else {
        db.execute(
            "UPDATE users SET name=?1, role=?2, active=?3, updated_at=?4 WHERE id=?5",
            params![name, role, active, now, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_user(state: tauri::State<'_, AppState>, id: String, user_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    if id == user_id {
        return Err("لا يمكنك حذف حسابك الخاص".to_string());
    }

    db.execute("DELETE FROM users WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn change_own_password(
    state: tauri::State<'_, AppState>,
    user_id: String,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    if new_password.trim().len() < 4 { return Err("كلمة المرور قصيرة جداً".to_string()); }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let stored: String = db.query_row(
        "SELECT password FROM users WHERE id = ?1",
        params![user_id],
        |row| row.get(0),
    ).map_err(|_| "المستخدم غير موجود".to_string())?;
    if !verify_password(&old_password, &stored) {
        return Err("كلمة المرور الحالية غير صحيحة".to_string());
    }
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE users SET password = ?1, updated_at = ?2 WHERE id = ?3",
        params![hash_password(&new_password), now, user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_own_profile(
    state: tauri::State<'_, AppState>,
    user_id: String,
    name: String,
    username: String,
) -> Result<User, String> {
    let name = name.trim().to_string();
    let username = username.trim().to_lowercase();
    if name.is_empty() || username.is_empty() {
        return Err("الاسم واسم المستخدم مطلوبان".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    crate::auth_guard::get_user_context(&db, &user_id)?;

    let taken: i64 = db.query_row(
        "SELECT COUNT(*) FROM users WHERE username = ?1 AND id != ?2",
        params![username, user_id],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;
    if taken > 0 {
        return Err("اسم المستخدم مستخدم بالفعل".to_string());
    }

    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE users SET name = ?1, username = ?2, updated_at = ?3 WHERE id = ?4",
        params![name, username, now, user_id],
    ).map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT id, name, username, role, active, created_at, updated_at FROM users WHERE id = ?1",
        params![user_id],
        |row| Ok(User {
            id: row.get(0)?, name: row.get(1)?, username: row.get(2)?,
            role: row.get(3)?, active: row.get(4)?,
            created_at: row.get(5)?, updated_at: row.get(6)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_quran_verse(state: tauri::State<'_, AppState>) -> Result<(String, String), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let result = db.query_row(
        "SELECT text, reference FROM quran_verses ORDER BY RANDOM() LIMIT 1",
        [],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    ).map_err(|e| e.to_string())?;
    Ok(result)
}
