// src-tauri/src/commands/calendar.rs
use rusqlite::params;
use crate::{AppState, models::CalendarEvent};

#[tauri::command]
pub fn get_calendar_events(
    state: tauri::State<'_, AppState>,
    date_from: String,
    date_to: String,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut events: Vec<CalendarEvent> = Vec::new();

    // Rental start events
    let mut stmt = db.prepare(
        "SELECT t.id, c.name, d.code, t.rental_start
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE t.transaction_type = 'rental'
           AND t.status = 'active'
           AND t.rental_start BETWEEN ?1 AND ?2",
    ).map_err(|e| e.to_string())?;

    let date_to_end = format!("{}T23:59:59Z", date_to);
    let rental_starts: Vec<CalendarEvent> = stmt
        .query_map(params![date_from, date_to_end], |row| {
            let id: String = row.get(0)?;
            let customer: Option<String> = row.get(1)?;
            let code: Option<String> = row.get(2)?;
            let date: Option<String> = row.get(3)?;
            Ok((id, customer, code, date))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter_map(|(id, customer, code, date)| {
            date.map(|d| CalendarEvent {
                id: id.clone(),
                event_type: "rental_start".to_string(),
                title: format!("تأجير — {}", code.as_deref().unwrap_or("?")),
                date: d,
                entity_id: id,
                customer_name: customer,
                dress_code: code,
                priority: None,
                description: None,
            })
        })
        .collect();
    events.extend(rental_starts);

    // Rental end / return events
    let mut stmt2 = db.prepare(
        "SELECT t.id, c.name, d.code, t.rental_end
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE t.transaction_type = 'rental'
           AND t.status = 'active'
           AND t.rental_end BETWEEN ?1 AND ?2",
    ).map_err(|e| e.to_string())?;

    let rental_ends: Vec<CalendarEvent> = stmt2
        .query_map(params![date_from, date_to_end], |row| {
            let id: String = row.get(0)?;
            let customer: Option<String> = row.get(1)?;
            let code: Option<String> = row.get(2)?;
            let date: Option<String> = row.get(3)?;
            Ok((id, customer, code, date))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter_map(|(id, customer, code, date)| {
            date.map(|d| CalendarEvent {
                id: id.clone(),
                event_type: "rental_end".to_string(),
                title: format!("إرجاع — {}", code.as_deref().unwrap_or("?")),
                date: d,
                entity_id: id,
                customer_name: customer,
                dress_code: code,
                priority: Some("high".to_string()),
                description: None,
            })
        })
        .collect();
    events.extend(rental_ends);

    // Pending reminders in range (join transactions → customers + dresses for full details)
    let mut stmt3 = db.prepare(
        "SELECT r.id, r.reminder_type, r.title, r.date, r.priority,
                COALESCE(c.name, r.customer_name), d.code, r.description
         FROM reminders r
         LEFT JOIN transactions t ON t.id = r.transaction_id
         LEFT JOIN customers c ON c.id = t.customer_id
         LEFT JOIN dresses d ON d.id = t.dress_id
         WHERE r.status = 'pending' AND r.date BETWEEN ?1 AND ?2",
    ).map_err(|e| e.to_string())?;

    let reminder_events: Vec<CalendarEvent> = stmt3
        .query_map(params![date_from, date_to_end], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|(id, rtype, title, date, priority, customer, dress, description)| CalendarEvent {
            id: id.clone(),
            event_type: rtype,
            title,
            date,
            entity_id: id,
            customer_name: customer,
            dress_code: dress,
            priority: Some(priority),
            description,
        })
        .collect();
    events.extend(reminder_events);

    // Sort by date
    events.sort_by(|a, b| a.date.cmp(&b.date));

    Ok(events)
}
