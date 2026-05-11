use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_customers(
    state: tauri::State<'_, AppState>,
    search: Option<String>,
) -> Result<Vec<Customer>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (query, params_vec): (String, Vec<String>) = if let Some(s) = search {
        if !s.trim().is_empty() {
            let like_val = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
            (
                "SELECT id, name, phone, address, notes, created_at, updated_at
                 FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC".to_string(),
                vec![like_val.clone(), like_val],
            )
        } else {
            (
                "SELECT id, name, phone, address, notes, created_at, updated_at
                 FROM customers ORDER BY name ASC".to_string(),
                vec![],
            )
        }
    } else {
        (
            "SELECT id, name, phone, address, notes, created_at, updated_at
             FROM customers ORDER BY name ASC".to_string(),
            vec![],
        )
    };

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        params_vec.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Customer {
                id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?,
                address: row.get(3)?, notes: row.get(4)?,
                created_at: row.get(5)?, updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(result)
}

#[tauri::command]
pub fn get_customer(state: tauri::State<'_, AppState>, id: String) -> Result<Customer, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.query_row(
        "SELECT id,name,phone,address,notes,created_at,updated_at FROM customers WHERE id=?1",
        params![id],
        |row| Ok(Customer {
            id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?,
            address: row.get(3)?, notes: row.get(4)?,
            created_at: row.get(5)?, updated_at: row.get(6)?,
        }),
    ).map_err(|_| "العميل غير موجود".to_string())
}

#[tauri::command]
pub fn create_customer(state: tauri::State<'_, AppState>, input: CreateCustomerInput) -> Result<Customer, String> {
    if input.name.trim().is_empty() {
        return Err("اسم العميل مطلوب".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Optional phone duplicate check
    if let Some(ref phone) = input.phone {
        if !phone.trim().is_empty() {
            let dup: i64 = db.query_row(
                "SELECT COUNT(*) FROM customers WHERE phone = ?1",
                params![phone],
                |r| r.get(0),
            ).unwrap_or(0);
            if dup > 0 {
                return Err("رقم الهاتف مسجل لعميل آخر".to_string());
            }
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO customers (id,name,phone,address,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?6)",
        params![id, input.name, input.phone, input.address, input.notes, now],
    ).map_err(|e| e.to_string())?;

    let desc = format!("تم إضافة العميل: {}", input.name);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.user_id.as_deref(),
        user_name: None,
        action: "create_customer",
        entity_type: "customer",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Customer { id, name: input.name, phone: input.phone, address: input.address, notes: input.notes, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn update_customer(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    phone: Option<String>,
    address: Option<String>,
    notes: Option<String>,
    user_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE customers SET name=?1, phone=?2, address=?3, notes=?4, updated_at=?5 WHERE id=?6",
        params![name, phone, address, notes, now, id],
    ).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "update_customer",
        entity_type: "customer",
        entity_id: Some(&id),
        description: "تم تعديل بيانات العميل",
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn delete_customer(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    let tx_count: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE customer_id = ?1",
        params![id],
        |r| r.get(0),
    ).unwrap_or(0);

    if tx_count > 0 {
        return Err(format!(
            "لا يمكن حذف العميل لوجود {} معاملة مرتبطة به",
            tx_count
        ));
    }

    let name: String = db.query_row(
        "SELECT name FROM customers WHERE id = ?1",
        params![id],
        |r| r.get(0),
    ).map_err(|_| "العميل غير موجود".to_string())?;

    db.execute("DELETE FROM customers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let desc = format!("تم حذف العميل: {}", name);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_customer",
        entity_type: "customer",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn get_customer_history(state: tauri::State<'_, AppState>, customer_id: String) -> Result<Vec<Transaction>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT t.id,t.transaction_type,t.customer_id,c.name,c.phone,t.dress_id,d.code,
                t.price,t.deposit,t.remaining,t.payment_method,t.status,
                t.rental_start,t.rental_end,t.return_date,t.employee_id,t.notes,
                t.created_at,t.updated_at,d.size,t.currency,t.exchange_rate_to_syp,t.usd_to_syp_snapshot,t.usd_to_try_snapshot
         FROM transactions t
         LEFT JOIN customers c ON c.id=t.customer_id
         LEFT JOIN dresses d ON d.id=t.dress_id
         WHERE t.customer_id=?1 ORDER BY t.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let result = stmt.query_map(params![customer_id], |row| {
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
