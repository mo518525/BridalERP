use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::*};

#[tauri::command]
pub fn get_transactions(
    state: tauri::State<'_, AppState>,
    filter: Option<FilterParams>,
) -> Result<Vec<Transaction>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut conditions = vec!["1=1".to_string()];
    let mut param_values: Vec<String> = vec![];

    if let Some(f) = filter {
        if let Some(s) = f.search {
            if !s.trim().is_empty() {
                conditions.push("(c.name LIKE ? OR d.code LIKE ?)".to_string());
                let like_val = format!("%{}%", s.replace('%', "\\%").replace('_', "\\_"));
                param_values.push(like_val.clone());
                param_values.push(like_val);
            }
        }
        if let Some(st) = f.status {
            if !st.trim().is_empty() {
                conditions.push("t.status = ?".to_string());
                param_values.push(st);
            }
        }
        if let Some(cat) = f.category {
            if !cat.trim().is_empty() {
                conditions.push("t.transaction_type = ?".to_string());
                param_values.push(cat);
            }
        }
        if let Some(df) = f.date_from {
            if !df.trim().is_empty() {
                conditions.push("t.created_at >= ?".to_string());
                param_values.push(df);
            }
        }
        if let Some(dt) = f.date_to {
            if !dt.trim().is_empty() {
                conditions.push("t.created_at <= ?".to_string());
                param_values.push(format!("{}T23:59:59Z", dt));
            }
        }
    }

    let query = format!(
        "SELECT t.id, t.transaction_type, t.customer_id, c.name, c.phone, t.dress_id, d.code,
                t.price, t.deposit, t.remaining, t.payment_method, t.status,
                t.rental_start, t.rental_end, t.return_date, t.employee_id, t.notes,
                t.created_at, t.updated_at, d.size, t.currency, t.exchange_rate_to_syp, t.usd_to_syp_snapshot, t.usd_to_try_snapshot
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE {}
         ORDER BY t.created_at DESC",
        conditions.join(" AND ")
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        param_values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map(params_refs.as_slice(), |row| {
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
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(result)
}

#[tauri::command]
pub fn get_transaction(state: tauri::State<'_, AppState>, id: String) -> Result<Transaction, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT t.id, t.transaction_type, t.customer_id, c.name, c.phone, t.dress_id, d.code,
                t.price, t.deposit, t.remaining, t.payment_method, t.status,
                t.rental_start, t.rental_end, t.return_date, t.employee_id, t.notes,
                t.created_at, t.updated_at, d.size, t.currency, t.exchange_rate_to_syp, t.usd_to_syp_snapshot, t.usd_to_try_snapshot
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE t.id = ?1",
    ).map_err(|e| e.to_string())?;

    let txs: Vec<Transaction> = stmt
        .query_map(params![id], |row| {
            Ok(Transaction {
                id: row.get(0)?, transaction_type: row.get(1)?,
                customer_id: row.get(2)?, customer_name: row.get(3)?, customer_phone: row.get(4)?,
                dress_id: row.get(5)?, dress_code: row.get(6)?, dress_size: row.get(19)?,
                price: row.get(7)?, deposit: row.get(8)?, remaining: row.get(9)?,
                payment_method: row.get(10)?, status: row.get(11)?,
                rental_start: row.get(12)?, rental_end: row.get(13)?,
                return_date: row.get(14)?, employee_id: row.get(15)?,
                notes: row.get(16)?, created_at: row.get(17)?, updated_at: row.get(18)?,
                currency: row.get::<_, Option<String>>(20)?.unwrap_or_else(|| "SYP".to_string()),
                exchange_rate_to_syp: row.get::<_, Option<f64>>(21)?.unwrap_or(1.0),
                usd_to_syp_snapshot: row.get::<_, Option<f64>>(22)?.unwrap_or(14000.0),
                usd_to_try_snapshot: row.get::<_, Option<f64>>(23)?.unwrap_or(34.0),
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    txs.into_iter().next().ok_or_else(|| "المعاملة غير موجودة".to_string())
}

#[tauri::command]
pub fn create_sale(state: tauri::State<'_, AppState>, input: CreateSaleInput) -> Result<Transaction, String> {
    crate::validation::validate_price_strict(input.price, "السعر")?;
    crate::validation::validate_deposit(input.deposit, input.price)?;
    crate::validation::validate_not_empty(&input.customer_id, "العميل")?;
    crate::validation::validate_not_empty(&input.dress_id, "الفستان")?;
    crate::validation::validate_payment_method(&input.payment_method)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Validate dress is available or reserved
    let dress_status: String = db.query_row(
        "SELECT status FROM dresses WHERE id=?1", params![input.dress_id], |r| r.get(0)
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if !["available", "reserved"].contains(&dress_status.as_str()) {
        return Err(format!("لا يمكن بيع فستان بحالة: {}", dress_status));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let remaining = input.price - input.deposit;

    // Update phone if provided
    if let Some(ref phone) = input.phone {
        if !phone.trim().is_empty() {
            let _ = db.execute(
                "UPDATE customers SET phone=?1, updated_at=?2 WHERE id=?3 AND (phone IS NULL OR phone='')",
                params![phone.trim(), now, input.customer_id],
            );
        }
    }

    let sale_currency = input.currency.unwrap_or_else(|| "SYP".to_string());
    let sale_rate = input.exchange_rate_to_syp.unwrap_or(1.0);
    let sale_usd_snap = input.usd_to_syp_snapshot.unwrap_or(14000.0);
    let sale_try_snap = input.usd_to_try_snapshot.unwrap_or(34.0);
    db.execute(
        "INSERT INTO transactions (id,transaction_type,customer_id,dress_id,price,deposit,remaining,payment_method,status,pickup_date,employee_id,notes,currency,exchange_rate_to_syp,usd_to_syp_snapshot,usd_to_try_snapshot,created_at,updated_at)
         VALUES (?1,'sale',?2,?3,?4,?5,?6,?7,'active',?8,?9,?10,?11,?12,?13,?14,?15,?15)",
        params![id, input.customer_id, input.dress_id, input.price, input.deposit, remaining,
                input.payment_method, input.pickup_date, input.employee_id, input.notes,
                sale_currency, sale_rate, sale_usd_snap, sale_try_snap, now],
    ).map_err(|e| e.to_string())?;

    // Update dress status to sold
    db.execute(
        "UPDATE dresses SET status='sold', updated_at=?1 WHERE id=?2",
        params![now, input.dress_id],
    ).map_err(|e| e.to_string())?;

    // Auto-create reminder if remaining > 0
    if remaining > 0.0 {
        let rem_id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
             VALUES (?1,'payment','دفعة متبقية','يوجد مبلغ متبقي من البيع',?2,'high','pending',?3,?4,?4)",
            params![rem_id, now, id, now],
        ).map_err(|e| e.to_string())?;
    }

    // Pickup reminder using provided date or now
    let pickup_id = Uuid::new_v4().to_string();
    let pickup_date = input.pickup_date.as_deref().unwrap_or(&now);
    db.execute(
        "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
         VALUES (?1,'pickup','موعد الاستلام','يجب على العميل استلام الفستان',?2,'normal','pending',?3,?4,?4)",
        params![pickup_id, pickup_date, id, now],
    ).map_err(|e| e.to_string())?;

    let dress_code: String = db.query_row(
        "SELECT code FROM dresses WHERE id=?1", params![input.dress_id], |r| r.get(0)
    ).unwrap_or_default();

    let customer_name: String = db.query_row(
        "SELECT name FROM customers WHERE id=?1", params![input.customer_id], |r| r.get(0)
    ).unwrap_or_default();

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.employee_id.as_deref(),
        user_name: None,
        action: "create_sale",
        entity_type: "transaction",
        entity_id: Some(&id),
        description: &format!("بيع فستان {} للعميل {} بسعر {} ر.س", dress_code, customer_name, input.price),
        metadata: None,
    });

    Ok(Transaction {
        id, transaction_type: "sale".to_string(),
        customer_id: input.customer_id, customer_name: Some(customer_name), customer_phone: None,
        dress_id: input.dress_id, dress_code: Some(dress_code), dress_size: None,
        price: input.price, deposit: input.deposit, remaining,
        payment_method: input.payment_method, status: "active".to_string(),
        rental_start: None, rental_end: None, return_date: None,
        employee_id: input.employee_id, notes: input.notes,
        currency: sale_currency, exchange_rate_to_syp: sale_rate,
        usd_to_syp_snapshot: sale_usd_snap, usd_to_try_snapshot: sale_try_snap,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn create_rental(state: tauri::State<'_, AppState>, input: CreateRentalInput) -> Result<Transaction, String> {
    crate::validation::validate_price_strict(input.price, "السعر")?;
    crate::validation::validate_deposit(input.deposit, input.price)?;
    crate::validation::validate_not_empty(&input.customer_id, "العميل")?;
    crate::validation::validate_not_empty(&input.dress_id, "الفستان")?;
    crate::validation::validate_payment_method(&input.payment_method)?;
    crate::validation::validate_date_range(&input.rental_start, &input.rental_end)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Validate dress availability
    let dress_status: String = db.query_row(
        "SELECT status FROM dresses WHERE id=?1", params![input.dress_id], |r| r.get(0)
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if !["available", "reserved"].contains(&dress_status.as_str()) {
        return Err(format!("لا يمكن تأجير فستان بحالة: {}", dress_status));
    }

    // Check no overlapping rentals
    let overlap: i64 = db.query_row(
        "SELECT COUNT(*) FROM transactions WHERE dress_id=?1 AND transaction_type='rental' AND status='active'
         AND NOT (rental_end < ?2 OR rental_start > ?3)",
        params![input.dress_id, input.rental_start, input.rental_end],
        |r| r.get(0),
    ).unwrap_or(0);

    if overlap > 0 {
        return Err("الفستان محجوز في هذا التاريخ".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let remaining = input.price - input.deposit;

    // Update phone if provided
    if let Some(ref phone) = input.phone {
        if !phone.trim().is_empty() {
            let _ = db.execute(
                "UPDATE customers SET phone=?1, updated_at=?2 WHERE id=?3 AND (phone IS NULL OR phone='')",
                params![phone.trim(), now, input.customer_id],
            );
        }
    }

    let rental_currency = input.currency.unwrap_or_else(|| "SYP".to_string());
    let rental_rate = input.exchange_rate_to_syp.unwrap_or(1.0);
    let rental_usd_snap = input.usd_to_syp_snapshot.unwrap_or(14000.0);
    let rental_try_snap = input.usd_to_try_snapshot.unwrap_or(34.0);
    db.execute(
        "INSERT INTO transactions (id,transaction_type,customer_id,dress_id,price,deposit,remaining,payment_method,status,rental_start,rental_end,employee_id,notes,currency,exchange_rate_to_syp,usd_to_syp_snapshot,usd_to_try_snapshot,created_at,updated_at)
         VALUES (?1,'rental',?2,?3,?4,?5,?6,?7,'active',?8,?9,?10,?11,?12,?13,?14,?15,?16,?16)",
        params![id, input.customer_id, input.dress_id, input.price, input.deposit, remaining,
                input.payment_method, input.rental_start, input.rental_end,
                input.employee_id, input.notes, rental_currency, rental_rate,
                rental_usd_snap, rental_try_snap, now],
    ).map_err(|e| e.to_string())?;

    // Update dress status to rented
    db.execute(
        "UPDATE dresses SET status='rented', updated_at=?1 WHERE id=?2",
        params![now, input.dress_id],
    ).map_err(|e| e.to_string())?;

    // Return reminder on rental_end date
    let rem_id = Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
         VALUES (?1,'return','موعد إرجاع الفستان','يجب إرجاع الفستان في هذا التاريخ',?2,'high','pending',?3,?4,?4)",
        params![rem_id, input.rental_end, id, now],
    ).map_err(|e| e.to_string())?;

    if remaining > 0.0 {
        let pay_id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
             VALUES (?1,'payment','دفعة متبقية','مبلغ متبقي من التأجير',?2,'normal','pending',?3,?4,?4)",
            params![pay_id, input.rental_end, id, now],
        ).map_err(|e| e.to_string())?;
    }

    let dress_code: String = db.query_row(
        "SELECT code FROM dresses WHERE id=?1", params![input.dress_id], |r| r.get(0)
    ).unwrap_or_default();
    let customer_name: String = db.query_row(
        "SELECT name FROM customers WHERE id=?1", params![input.customer_id], |r| r.get(0)
    ).unwrap_or_default();

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: input.employee_id.as_deref(),
        user_name: None,
        action: "create_rental",
        entity_type: "transaction",
        entity_id: Some(&id),
        description: &format!("تأجير فستان {} للعميل {} من {} إلى {}", dress_code, customer_name, input.rental_start, input.rental_end),
        metadata: None,
    });

    Ok(Transaction {
        id, transaction_type: "rental".to_string(),
        customer_id: input.customer_id, customer_name: Some(customer_name), customer_phone: None,
        dress_id: input.dress_id, dress_code: Some(dress_code), dress_size: None,
        price: input.price, deposit: input.deposit, remaining,
        payment_method: input.payment_method, status: "active".to_string(),
        rental_start: Some(input.rental_start), rental_end: Some(input.rental_end),
        return_date: None, employee_id: input.employee_id, notes: input.notes,
        currency: rental_currency, exchange_rate_to_syp: rental_rate,
        usd_to_syp_snapshot: rental_usd_snap, usd_to_try_snapshot: rental_try_snap,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn process_return(state: tauri::State<'_, AppState>, input: ProcessReturnInput) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let (dress_id, tx_type): (String, String) = db.query_row(
        "SELECT dress_id, transaction_type FROM transactions WHERE id=?1",
        params![input.transaction_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "المعاملة غير موجودة".to_string())?;

    if tx_type != "rental" {
        return Err("هذه المعاملة ليست تأجيراً".to_string());
    }

    // Return the dress: complete the transaction, auto-settle any remaining payment
    db.execute(
        "UPDATE transactions SET status='completed', return_date=?1, remaining=0, deposit=price, notes=COALESCE(?2, notes), updated_at=?1 WHERE id=?3",
        params![now, input.notes, input.transaction_id],
    ).map_err(|e| e.to_string())?;

    let new_dress_status = if input.needs_cleaning { "cleaning" } else { "available" };
    db.execute(
        "UPDATE dresses SET status=?1, cleaner_name=?2, updated_at=?3 WHERE id=?4",
        params![new_dress_status, input.cleaner_name, now, dress_id],
    ).map_err(|e| e.to_string())?;

    if input.needs_cleaning {
        let rem_id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO reminders (id,reminder_type,title,description,date,priority,status,transaction_id,created_at,updated_at)
             VALUES (?1,'cleaning','تنظيف الفستان','الفستان يحتاج تنظيف بعد الإرجاع',?2,'normal','pending',?3,?4,?4)",
            params![rem_id, now, input.transaction_id, now],
        ).map_err(|e| e.to_string())?;
    }

    // Delete return + payment reminders (they're fulfilled)
    db.execute(
        "DELETE FROM reminders WHERE transaction_id=?1 AND reminder_type IN ('return','payment')",
        params![input.transaction_id],
    ).map_err(|e| e.to_string())?;

    let clean_note = if input.needs_cleaning { "يحتاج تنظيف" } else { "متاح مباشرة" };
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: None,
        user_name: None,
        action: "process_return",
        entity_type: "transaction",
        entity_id: Some(&input.transaction_id),
        description: &format!("تم إرجاع الفستان — {}", clean_note),
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn mark_cleaning_done(
    state: tauri::State<'_, AppState>,
    dress_id: String,
    user_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    // Guard: dress must be in cleaning state
    let status: String = db.query_row(
        "SELECT status FROM dresses WHERE id = ?1",
        params![dress_id],
        |r| r.get(0),
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if status != "cleaning" {
        return Err(format!("الفستان ليس في حالة تنظيف، الحالة الحالية: {}", status));
    }

    db.execute(
        "UPDATE dresses SET status = 'available', updated_at = ?1 WHERE id = ?2",
        params![now, dress_id],
    ).map_err(|e| e.to_string())?;

    // Delete any open cleaning reminders for this dress
    db.execute(
        "DELETE FROM reminders
         WHERE reminder_type = 'cleaning' AND status = 'pending'
         AND transaction_id IN (
             SELECT id FROM transactions WHERE dress_id = ?1
         )",
        params![dress_id],
    ).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "mark_cleaning_done",
        entity_type: "dress",
        entity_id: Some(&dress_id),
        description: "تم إنهاء التنظيف، الفستان أصبح متاحاً",
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn complete_transaction(
    state: tauri::State<'_, AppState>,
    id: String,
    amount_paid: f64,
    user_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    if amount_paid < 0.0 {
        return Err("المبلغ المدفوع لا يمكن أن يكون سالباً".to_string());
    }

    // Fetch current transaction state
    let (current_status, current_remaining, tx_type): (String, f64, String) = db.query_row(
        "SELECT status, remaining, transaction_type FROM transactions WHERE id = ?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| "المعاملة غير موجودة".to_string())?;

    if current_status == "cancelled" {
        return Err("لا يمكن إتمام معاملة ملغية".to_string());
    }
    // Allow settling payment on completed rentals that still have remaining > 0 (legacy data)
    if current_status == "completed" && current_remaining <= 0.0 {
        return Err("المعاملة مكتملة بالفعل".to_string());
    }

    let new_remaining = (current_remaining - amount_paid).max(0.0);

    // For active rentals: settling payment does NOT mark as completed.
    // "completed" means the dress was physically returned (handled by process_return).
    let is_active_rental = tx_type == "rental" && current_status == "active";
    let new_status: String = if new_remaining <= 0.0 && !is_active_rental {
        "completed".to_string()
    } else {
        current_status.clone()
    };

    db.execute(
        "UPDATE transactions SET status = ?1, deposit = deposit + ?2, remaining = ?3, updated_at = ?4 WHERE id = ?5",
        params![new_status, amount_paid, new_remaining, now, id],
    ).map_err(|e| e.to_string())?;

    // Delete payment reminders once fully paid
    if new_remaining <= 0.0 {
        db.execute(
            "DELETE FROM reminders WHERE transaction_id = ?1 AND reminder_type = 'payment' AND status = 'pending'",
            params![id],
        ).map_err(|e| e.to_string())?;
    }

    // Activity log
    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: user_id.as_deref(),
        user_name: None,
        action: "complete_transaction",
        entity_type: "transaction",
        entity_id: Some(&id),
        description: &format!("تم دفع {}, المتبقي: {}, الحالة: {}", amount_paid, new_remaining, new_status),
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn cancel_transaction(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let (dress_id, tx_type): (String, String) = db.query_row(
        "SELECT dress_id, transaction_type FROM transactions WHERE id=?1",
        params![id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "المعاملة غير موجودة".to_string())?;

    db.execute(
        "UPDATE transactions SET status='cancelled', updated_at=?1 WHERE id=?2",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    // Restore dress to available (unless it was a sale of a sold dress)
    if tx_type == "rental" {
        db.execute(
            "UPDATE dresses SET status='available', updated_at=?1 WHERE id=?2",
            params![now, dress_id],
        ).map_err(|e| e.to_string())?;
    } else {
        // For sale cancellations, make it available again
        db.execute(
            "UPDATE dresses SET status='available', updated_at=?1 WHERE id=?2",
            params![now, dress_id],
        ).map_err(|e| e.to_string())?;
    }

    db.execute(
        "UPDATE reminders SET status='cancelled', updated_at=?1 WHERE transaction_id=?2",
        params![now, id],
    ).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: None,
        user_name: None,
        action: "cancel_transaction",
        entity_type: "transaction",
        entity_id: Some(&id),
        description: "تم إلغاء المعاملة وإعادة الفستان للمخزون",
        metadata: None,
    });

    Ok(())
}

#[tauri::command]
pub fn reserve_dress(state: tauri::State<'_, AppState>, dress_id: String, customer_id: String, notes: Option<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let status: String = db.query_row(
        "SELECT status FROM dresses WHERE id=?1", params![dress_id], |r| r.get(0)
    ).map_err(|_| "الفستان غير موجود".to_string())?;

    if status != "available" {
        return Err("الفستان غير متاح للحجز".to_string());
    }

    db.execute(
        "UPDATE dresses SET status='reserved', updated_at=?1 WHERE id=?2",
        params![now, dress_id],
    ).map_err(|e| e.to_string())?;

    crate::activity_helper::log_activity(&db, crate::activity_helper::ActivityEntry {
        user_id: None,
        user_name: None,
        action: "reserve_dress",
        entity_type: "dress",
        entity_id: Some(&dress_id),
        description: &format!("تم حجز الفستان للعميل"),
        metadata: None,
    });

    let _ = (customer_id, notes);
    Ok(())
}
