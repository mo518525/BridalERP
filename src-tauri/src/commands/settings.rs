use tauri::{AppHandle, Manager, State};
use chrono::Utc;
use crate::AppState;
use crate::auth_guard;

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT value FROM app_settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    Ok(stmt.query_row([&key], |row| row.get::<_, String>(0)).ok())
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, user_id: String, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = auth_guard::get_user_context(&db, &user_id)?;
    auth_guard::require_owner(&ctx)?;
    db.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [&key, &value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn backup_database(state: State<AppState>, app: AppHandle, user_id: String) -> Result<String, String> {
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let ctx = auth_guard::get_user_context(&db, &user_id)?;
        auth_guard::require_owner(&ctx)?;
        let _ = db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_src = app_dir.join("bridal_erp.db");

    let downloads = dirs::download_dir()
        .ok_or_else(|| "لم يتم العثور على مجلد التنزيلات".to_string())?;
    let backups_dir = downloads.join("BridalERP_Backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let stamp = Utc::now().format("%Y-%m-%d_%H-%M").to_string();
    let dst = backups_dir.join(format!("bridal_erp_{}.db", stamp));
    std::fs::copy(&db_src, &dst).map_err(|e| e.to_string())?;

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let _ = db.execute(
            "INSERT INTO app_settings (key, value) VALUES ('last_backup_date', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [&today],
        );
    }

    Ok(dst.to_string_lossy().to_string())
}

fn is_valid_license(key: &str) -> bool {
    // Format: BRIDAL-XXXX-XXXX-XXXX (alphanumeric segments)
    let parts: Vec<&str> = key.split('-').collect();
    if parts.len() != 4 { return false; }
    if parts[0] != "BRIDAL" { return false; }
    parts[1..].iter().all(|p| p.len() == 4 && p.chars().all(|c| c.is_ascii_alphanumeric()))
}

#[tauri::command]
pub fn activate_license(state: State<AppState>, user_id: String, key: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = auth_guard::get_user_context(&db, &user_id)?;
    auth_guard::require_owner(&ctx)?;
    let key = key.trim().to_uppercase();
    if !is_valid_license(&key) {
        return Err("مفتاح الترخيص غير صالح — الصيغة الصحيحة: BRIDAL-XXXX-XXXX-XXXX".to_string());
    }
    db.execute(
        "INSERT INTO app_settings (key, value) VALUES ('license_key', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [&key],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO app_settings (key, value) VALUES ('license_status', 'active') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        ["active"],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
