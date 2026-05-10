use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_next_delivery_number(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT delivery_number FROM deliveries")
        .map_err(|e| e.to_string())?;
    let max_num = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter_map(|n| n.parse::<u32>().ok())
        .max()
        .unwrap_or(0);
    Ok(format!("{:04}", max_num + 1))
}

#[tauri::command]
pub fn get_deliveries(state: tauri::State<'_, AppState>) -> Result<Vec<Delivery>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT d.id, d.delivery_number, d.supplier, d.delivery_date, d.total_cost, d.notes,
                COUNT(di.id) as item_count, d.created_at, d.updated_at
         FROM deliveries d
         LEFT JOIN delivery_items di ON di.delivery_id=d.id
         GROUP BY d.id
         ORDER BY d.delivery_date DESC"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(Delivery {
            id: row.get(0)?, delivery_number: row.get(1)?, supplier: row.get(2)?,
            delivery_date: row.get(3)?, total_cost: row.get(4)?, notes: row.get(5)?,
            item_count: row.get(6)?, created_at: row.get(7)?, updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok()).collect();
    Ok(items)
}

#[tauri::command]
pub fn create_delivery(
    state: tauri::State<'_, AppState>,
    input: CreateDeliveryInput,
    user_id: Option<String>,
) -> Result<Delivery, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    crate::validation::validate_not_empty(&input.delivery_number, "رقم التوريد")?;

    db.execute(
        "INSERT INTO deliveries (id, delivery_number, supplier, delivery_date, total_cost, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![id, input.delivery_number, input.supplier, input.delivery_date,
                input.total_cost, input.notes, now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "رقم التوريد مستخدم بالفعل".to_string()
        } else {
            e.to_string()
        }
    })?;

    // Insert delivery items for provided dress_ids
    for dress_id in &input.dress_ids {
        let item_id = Uuid::new_v4().to_string();
        let _ = db.execute(
            "INSERT INTO delivery_items (id, delivery_id, dress_id, cost) VALUES (?1, ?2, ?3, 0)",
            params![item_id, id, dress_id],
        );
    }

    let desc = format!("توريد جديد {} من {} — {} فستان",
        input.delivery_number,
        input.supplier.as_deref().unwrap_or("غير محدد"),
        input.dress_ids.len());
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "create_delivery",
        entity_type: "delivery",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(Delivery {
        id,
        delivery_number: input.delivery_number,
        supplier: input.supplier,
        delivery_date: input.delivery_date,
        total_cost: input.total_cost,
        notes: input.notes,
        item_count: input.dress_ids.len() as i64,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_delivery_dresses(
    state: tauri::State<'_, AppState>,
    delivery_id: String,
) -> Result<Vec<Dress>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT dr.id, dr.code, dr.status, dr.color, dr.size, dr.style,
                dr.price, dr.notes, dr.image_path, dr.cleaner_name, dr.created_at, dr.updated_at
         FROM delivery_items di
         JOIN dresses dr ON dr.id = di.dress_id
         WHERE di.delivery_id = ?1
         ORDER BY dr.code"
    ).map_err(|e| e.to_string())?;

    let dresses = stmt.query_map(params![delivery_id], |row| {
        Ok(Dress {
            id: row.get(0)?, code: row.get(1)?, status: row.get(2)?,
            color: row.get(3)?, size: row.get(4)?, style: row.get(5)?,
            price: row.get(6)?, notes: row.get(7)?, image_path: row.get(8)?,
            cleaner_name: row.get(9)?, created_at: row.get(10)?, updated_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok()).collect();
    Ok(dresses)
}

#[tauri::command]
pub fn add_dress_to_delivery(
    state: tauri::State<'_, AppState>,
    delivery_id: String,
    dress_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let item_id = Uuid::new_v4().to_string();
    db.execute(
        "INSERT OR IGNORE INTO delivery_items (id, delivery_id, dress_id, cost) VALUES (?1, ?2, ?3, 0)",
        params![item_id, delivery_id, dress_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_delivery(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    let delivery_number: String = db.query_row(
        "SELECT delivery_number FROM deliveries WHERE id = ?1",
        params![id],
        |r| r.get(0),
    ).map_err(|_| "التوريد غير موجود".to_string())?;

    // Delete items first (FK constraint)
    db.execute("DELETE FROM delivery_items WHERE delivery_id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    db.execute("DELETE FROM deliveries WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let desc = format!("تم حذف التوريد: {}", delivery_number);
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: Some(&user_id),
        user_name: None,
        action: "delete_delivery",
        entity_type: "delivery",
        entity_id: Some(&id),
        description: &desc,
        metadata: None,
    });

    Ok(())
}
