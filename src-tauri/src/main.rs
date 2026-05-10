// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod utils;
mod validation;
mod activity_helper;
mod auth_guard;
mod commands;

use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[tauri::command]
fn save_to_downloads(filename: String, content: String) -> Result<String, String> {
    let dir = dirs::download_dir().ok_or_else(|| "لم يتم العثور على مجلد التنزيلات".to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&filename);
    std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn save_pdf_to_downloads(html_content: String, filename: String) -> Result<String, String> {
    use std::time::Duration;
    use std::io::ErrorKind;

    let dl_dir = dirs::download_dir()
        .ok_or_else(|| "لم يتم العثور على مجلد التنزيلات".to_string())?;
    std::fs::create_dir_all(&dl_dir).map_err(|e| e.to_string())?;
    let pdf_path  = dl_dir.join(format!("{}.pdf", filename));
    let temp_html = std::env::temp_dir().join("bridal_erp_report.html");
    std::fs::write(&temp_html, html_content.as_bytes()).map_err(|e| e.to_string())?;
    let html_url = format!("file:///{}", temp_html.to_string_lossy().replace('\\', "/"));

    let browser_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ];

    let mut pdf_ok = false;

    // CDP: launch browser headless, connect via WebSocket, printToPDF
    'cdp: for exe in &browser_paths {
        if !std::path::Path::new(exe).exists() { continue; }

        const PORT: u16 = 9223;
        let port_arg = format!("--remote-debugging-port={}", PORT);

        // kill any stale process holding the port first
        let _ = std::process::Command::new("cmd")
            .args(["/C", &format!("for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :{PORT}') do taskkill /F /PID %a")])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .output();
        std::thread::sleep(Duration::from_millis(300));

        let mut browser_proc = std::process::Command::new(exe)
            .args(["--headless=new", "--disable-gpu", "--no-sandbox",
                   "--disable-extensions", "--disable-background-networking",
                   "--no-first-run", "--no-default-browser-check",
                   &port_arg])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .ok();

        if browser_proc.is_none() { continue; }

        // poll /json/version — wait up to 6s
        let ready = (|| {
            for _ in 0..30 {
                std::thread::sleep(Duration::from_millis(200));
                if ureq::get(&format!("http://127.0.0.1:{}/json/version", PORT))
                    .timeout(Duration::from_millis(300))
                    .call().is_ok() { return true; }
            }
            false
        })();

        if !ready {
            if let Some(mut p) = browser_proc.take() { let _ = p.kill(); let _ = p.wait(); }
            continue;
        }

        let cdp_result: Result<(), String> = (|| {
            // modern Chromium/Edge requires PUT for /json/new
            let tab_resp = ureq::put(&format!("http://127.0.0.1:{}/json/new", PORT))
                .timeout(Duration::from_secs(5))
                .call().map_err(|e| e.to_string())?;
            let tab_json: serde_json::Value = tab_resp.into_json().map_err(|e| e.to_string())?;
            let ws_url = tab_json["webSocketDebuggerUrl"].as_str()
                .ok_or("no webSocketDebuggerUrl")?.to_string();

            // connect WebSocket and set 12s read timeout on the TCP socket
            let (mut ws, _) = tungstenite::connect(&ws_url).map_err(|e| e.to_string())?;
            if let tungstenite::stream::MaybeTlsStream::Plain(tcp) = ws.get_ref() {
                let _ = tcp.set_read_timeout(Some(Duration::from_secs(12)));
            }

            // send all 3 commands upfront
            let cmds = [
                r#"{"id":1,"method":"Page.enable","params":{}}"#.to_string(),
                serde_json::json!({"id":2,"method":"Page.navigate","params":{"url": html_url}}).to_string(),
            ];
            for cmd in &cmds {
                ws.write_message(tungstenite::Message::Text(cmd.clone()))
                    .map_err(|e| e.to_string())?;
            }

            // drain until loadEventFired or 10s timeout
            let load_deadline = std::time::Instant::now() + Duration::from_secs(10);
            loop {
                if std::time::Instant::now() > load_deadline { break; }
                match ws.read_message() {
                    Ok(tungstenite::Message::Text(txt)) => {
                        if txt.contains("Page.loadEventFired") { break; }
                    }
                    Err(tungstenite::Error::Io(ref e))
                        if e.kind() == ErrorKind::WouldBlock || e.kind() == ErrorKind::TimedOut => break,
                    Err(e) => return Err(e.to_string()),
                    _ => {}
                }
            }

            // printToPDF (3 cm = 1.1811 in)
            let print_cmd = serde_json::json!({
                "id": 3,
                "method": "Page.printToPDF",
                "params": {
                    "displayHeaderFooter": false,
                    "marginTop":    1.1811,
                    "marginBottom": 1.1811,
                    "marginLeft":   1.1811,
                    "marginRight":  1.1811,
                    "printBackground": true,
                    "preferCSSPageSize": true
                }
            });
            ws.write_message(tungstenite::Message::Text(print_cmd.to_string()))
                .map_err(|e| e.to_string())?;

            // wait for PDF data — up to 30s; re-arm read timeout
            if let tungstenite::stream::MaybeTlsStream::Plain(tcp) = ws.get_ref() {
                let _ = tcp.set_read_timeout(Some(Duration::from_secs(30)));
            }
            loop {
                match ws.read_message() {
                    Ok(tungstenite::Message::Text(txt)) if txt.contains(r#""id":3"#) => {
                        let v: serde_json::Value = serde_json::from_str(&txt).map_err(|e| e.to_string())?;
                        let b64 = v["result"]["data"].as_str().ok_or("no PDF data in response")?;
                        use base64::Engine;
                        let bytes = base64::engine::general_purpose::STANDARD
                            .decode(b64).map_err(|e| e.to_string())?;
                        std::fs::write(&pdf_path, bytes).map_err(|e| e.to_string())?;
                        return Ok(());
                    }
                    Err(tungstenite::Error::Io(ref e))
                        if e.kind() == ErrorKind::WouldBlock || e.kind() == ErrorKind::TimedOut =>
                            return Err("PDF generation timed out".to_string()),
                    Err(e) => return Err(e.to_string()),
                    _ => {}
                }
            }
        })();

        if let Some(mut p) = browser_proc.take() { let _ = p.kill(); let _ = p.wait(); }

        if cdp_result.is_ok() && pdf_path.exists() {
            pdf_ok = true;
            break 'cdp;
        }
    }

    let _ = std::fs::remove_file(&temp_html);

    if pdf_ok {
        Ok(pdf_path.to_string_lossy().to_string())
    } else {
        let html_path = dl_dir.join(format!("{}.html", filename));
        std::fs::write(&html_path, html_content.as_bytes()).map_err(|e| e.to_string())?;
        Ok(html_path.to_string_lossy().to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data directory");
            let db_path = app_dir.join("bridal_erp.db");
            let conn = db::init_db(&db_path)
                .expect("Failed to initialize database");
            app.manage(AppState { db: Mutex::new(conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Home
            commands::home::get_home_summary,
            // Auth
            commands::auth::login,
            commands::auth::get_users,
            commands::auth::create_user,
            commands::auth::update_user,
            commands::auth::delete_user,
            commands::auth::get_quran_verse,
            // Inventory
            commands::inventory::get_dresses,
            commands::inventory::get_dress,
            commands::inventory::get_next_dress_code,
            commands::inventory::create_dress,
            commands::inventory::update_dress,
            commands::inventory::update_dress_status,
            commands::inventory::delete_dress,
            commands::inventory::get_dress_history,
            // Transactions
            commands::transactions::get_transactions,
            commands::transactions::get_transaction,
            commands::transactions::create_sale,
            commands::transactions::create_rental,
            commands::transactions::process_return,
            commands::transactions::mark_cleaning_done,
            commands::transactions::complete_transaction,
            commands::transactions::cancel_transaction,
            commands::transactions::reserve_dress,
            // Customers
            commands::customers::get_customers,
            commands::customers::get_customer,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::delete_customer,
            commands::customers::get_customer_history,
            // Expenses
            commands::expenses::get_expenses,
            commands::expenses::create_expense,
            commands::expenses::update_expense,
            commands::expenses::delete_expense,
            // Reminders
            commands::reminders::get_reminders,
            commands::reminders::create_reminder,
            commands::reminders::mark_reminder_done,
            commands::reminders::delete_reminder,
            commands::reminders::update_reminder,
            // Activity
            commands::activity::get_activity_log,
            commands::activity::log_activity,
            // Reports
            commands::reports::get_dashboard_stats,
            commands::reports::get_financial_report,
            commands::reports::get_inventory_report,
            // Deliveries
            commands::deliveries::get_next_delivery_number,
            commands::deliveries::get_deliveries,
            commands::deliveries::get_delivery_dresses,
            commands::deliveries::add_dress_to_delivery,
            commands::deliveries::create_delivery,
            commands::deliveries::delete_delivery,
            // Calendar
            commands::calendar::get_calendar_events,
            // Exports
            save_to_downloads,
            save_pdf_to_downloads,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
