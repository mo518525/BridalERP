use rusqlite::{params, Connection};
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

fn next_dress_code(db: &Connection) -> Result<String, String> {
    let mut stmt = db.prepare("SELECT code FROM dresses")
        .map_err(|e| e.to_string())?;

    let max_number = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|row| row.ok())
        .filter_map(|code| {
            let first_digit = code.find(|ch: char| ch.is_ascii_digit())?;
            code[first_digit..].parse::<u32>().ok()
        })
        .max()
        .unwrap_or(0);

    Ok(format!("W{:03}", max_number + 1))
}

#[tauri::command]
pub fn get_next_dress_code(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    next_dress_code(&db)
}

#[tauri::command]
pub fn get_dresses(
    state: tauri::State<'_, AppState>,
    filter: Option<FilterParams>,
) -> Result<Vec<Dress>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec!["1=1".to_string()];
    let mut param_values: Vec<String> = vec![];

    if let Some(f) = filter {
        if let Some(s) = f.search {
            if !s.trim().is_empty() {
                conditions.push("(code LIKE ? OR color LIKE ? OR style LIKE ?)".to_string());
                let like_val = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
                param_values.push(like_val.clone());
                param_values.push(like_val.clone());
                param_values.push(like_val);
            }
        }
        if let Some(st) = f.status {
            if !st.trim().is_empty() {
                conditions.push("status = ?".to_string());
                param_values.push(st);
            }
        }
    }

    let query = format!(
        "SELECT id, code, status, color, size, style, price, notes, image_path, cleaner_name, created_at, updated_at
         FROM dresses WHERE {} ORDER BY created_at DESC",
        conditions.join(" AND ")
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        param_values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Dress {
                id: row.get(0)?, code: row.get(1)?, status: row.get(2)?,
                color: row.get(3)?, size: row.get(4)?, style: row.get(5)?,
                price: row.get(6)?,
                notes: row.get(7)?, image_path: row.get(8)?,
                cleaner_name: row.get(9)?,
                created_at: row.get(10)?, updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(result)
}

#[tauri::command]
pub fn get_dress(state: tauri::State<'_, AppState>, id: String) -> Result<Dress, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(
        "SELECT id,code,status,color,size,style,price,notes,image_path,cleaner_name,created_at,updated_at FROM dresses WHERE id=?1",
        params![id],
        |row| Ok(Dress {
            id: row.get(0)?,
            code: row.get(1)?,
            status: row.get(2)?,
            color: row.get(3)?,
            size: row.get(4)?,
            style: row.get(5)?,
            price: row.get(6)?,
            notes: row.get(7)?,
            image_path: row.get(8)?,
            cleaner_name: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        }),
    ).map_err(|_| "الفستان غير موجود".to_string())
}

#[tauri::command]
pub fn create_dress(state: tauri::State<'_, AppState>, input: CreateDressInput) -> Result<Dress, String> {
    crate::validation::validate_price(input.price, "السعر")?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let code = if input.code.trim().is_empty() {
        next_dress_code(&db)?
    } else {
        input.code.trim().to_string()
    };

    crate::validation::validate_not_empty(&code, "الرمز")?;

    let exists: i64 = db.query_row(
        "SELECT COUNT(*) FROM dresses WHERE code=?1", params![code], |r| r.get(0)
    ).unwrap_or(0);
    if exists > 0 { return Err("كود الفستان موجود بالفعل".to_string()); }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO dresses (id,code,status,color,size,style,price,notes,image_path,created_at,updated_at)
         VALUES (?1,?2,'available',?3,?4,?5,?6,?7,?8,?9,?9)",
        params![id, code, input.color, input.size, input.style,
                input.price, input.notes, input.image_path, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("تم إضافة فستان جديد: {}", code);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.user_id.as_deref(),
        user_name: None,
        action: "create_dress",
        entity_type: "dress",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Dress {
        id, code, status: "available".to_string(),
        color: input.color, size: input.size, style: input.style,
        price: input.price,
        notes: input.notes, image_path: input.image_path,
        cleaner_name: None,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn update_dress(state: tauri::State<'_, AppState>, input: UpdateDressInput) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    db.execute(
        "UPDATE dresses SET
            code=COALESCE(?1,code), color=?2, size=?3, style=?4,
            price=COALESCE(?5,price),
            notes=?6, image_path=?7, updated_at=?8
         WHERE id=?9",
        params![input.code, input.color, input.size, input.style,
                input.price, input.notes, input.image_path, now, input.id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_dress_status(state: tauri::State<'_, AppState>, dress_id: String, status: String) -> Result<(), String> {
    // Validate status
    let valid = ["available", "reserved", "rented", "cleaning", "sold"];
    if !valid.contains(&status.as_str()) {
        return Err("حالة غير صحيحة".to_string());
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    // Cannot change sold dress status
    let current_status: String = db.query_row(
        "SELECT status FROM dresses WHERE id=?1", params![dress_id], |r| r.get(0)
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if current_status == "sold" {
        return Err("لا يمكن تغيير حالة فستان مباع".to_string());
    }

    db.execute(
        "UPDATE dresses SET status=?1, updated_at=?2 WHERE id=?3",
        params![status, now, dress_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_dress(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    let (status, code): (String, String) = db.query_row(
        "SELECT status, code FROM dresses WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if status == "rented" {
        return Err("لا يمكن حذف فستان مؤجر حالياً".to_string());
    }
    if status == "sold" {
        return Err("لا يمكن حذف فستان مباع".to_string());
    }

    db.execute("DELETE FROM dresses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let desc = format!("تم حذف الفستان: {}", code);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_dress",
        entity_type: "dress",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn get_dress_history(state: tauri::State<'_, AppState>, dress_id: String) -> Result<Vec<Transaction>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
"SELECT t.id, t.transaction_type, t.customer_id, c.name, c.phone, t.dress_id, d.code,
                t.price, t.deposit, t.remaining, t.payment_method, t.status,
                t.rental_start, t.rental_end, t.return_date, t.employee_id, t.notes,
                t.created_at, t.updated_at, d.size, t.currency, t.exchange_rate_to_syp, t.usd_to_syp_snapshot, t.usd_to_try_snapshot
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE t.dress_id = ?1
         ORDER BY t.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let result = stmt.query_map(params![dress_id], |row| {
        Ok(Transaction {
    id: row.get(0)?,
    transaction_type: row.get(1)?,
    customer_id: row.get(2)?,
    customer_name: row.get(3)?,
    customer_phone: row.get(4)?,
    dress_id: row.get(5)?,
    dress_code: row.get(6)?,
    dress_size: row.get(19)?,
    price: row.get(7)?,
    deposit: row.get(8)?,
    remaining: row.get(9)?,
    payment_method: row.get(10)?,
    status: row.get(11)?,
    rental_start: row.get(12)?,
    rental_end: row.get(13)?,
    return_date: row.get(14)?,
    employee_id: row.get(15)?,
    notes: row.get(16)?,
    created_at: row.get(17)?,
    updated_at: row.get(18)?,
    currency: row.get::<_, Option<String>>(20)?.unwrap_or_else(|| "SYP".to_string()),
    exchange_rate_to_syp: row.get::<_, Option<f64>>(21)?.unwrap_or(1.0),
    usd_to_syp_snapshot: row.get::<_, Option<f64>>(22)?.unwrap_or(14000.0),
    usd_to_try_snapshot: row.get::<_, Option<f64>>(23)?.unwrap_or(34.0),
})
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok()).collect();
    Ok(result)
}
