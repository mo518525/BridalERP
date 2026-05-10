use rusqlite::{Connection, Result, params};
use std::path::Path;
use uuid::Uuid;
use chrono::Utc;
use crate::utils::hash_password;

pub fn init_db(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    conn.execute_batch("PRAGMA synchronous=NORMAL;")?;
    conn.execute_batch("PRAGMA cache_size=-8000;")?;

    conn.execute_batch(SCHEMA)?;

    // Column migrations (safe to run multiple times)
    let _ = conn.execute_batch("ALTER TABLE reminders ADD COLUMN customer_name TEXT;");
    let _ = conn.execute_batch("ALTER TABLE dresses ADD COLUMN price REAL NOT NULL DEFAULT 0;");
    let _ = conn.execute_batch("ALTER TABLE expenses ADD COLUMN recurring_type TEXT NOT NULL DEFAULT 'none';");
    let _ = conn.execute_batch("UPDATE expenses SET recurring_type='monthly' WHERE recurring=1 AND recurring_type='none'");

    // Migration: widen payment_method to allow 'shamcash' by recreating transactions without CHECK
    migrate_transactions_payment_method(&conn)?;

    // Column migrations for transactions
    let _ = conn.execute_batch("ALTER TABLE transactions ADD COLUMN pickup_date TEXT;");
    let _ = conn.execute_batch("ALTER TABLE dresses ADD COLUMN cleaner_name TEXT;");
    let _ = conn.execute_batch("ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'SYP';");
    let _ = conn.execute_batch("ALTER TABLE transactions ADD COLUMN exchange_rate_to_syp REAL NOT NULL DEFAULT 1;");
    let _ = conn.execute_batch("ALTER TABLE transactions ADD COLUMN usd_to_syp_snapshot REAL NOT NULL DEFAULT 14000;");
    let _ = conn.execute_batch("ALTER TABLE transactions ADD COLUMN usd_to_try_snapshot REAL NOT NULL DEFAULT 34;");
    let _ = conn.execute_batch("ALTER TABLE expenses ADD COLUMN usd_to_syp_snapshot REAL NOT NULL DEFAULT 14000;");
    let _ = conn.execute_batch("ALTER TABLE expenses ADD COLUMN currency TEXT NOT NULL DEFAULT 'SYP';");
    let _ = conn.execute_batch("ALTER TABLE expenses ADD COLUMN usd_to_try_snapshot REAL NOT NULL DEFAULT 34;");

    // New tables: announcements and employee_todos
    let _ = conn.execute_batch("
        CREATE TABLE IF NOT EXISTS announcements (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            body        TEXT,
            created_by  TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );
    ");
    let _ = conn.execute_batch("
        CREATE TABLE IF NOT EXISTS employee_todos (
            id          TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            text        TEXT NOT NULL,
            done        INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL
        );
    ");

    seed_default_data(&conn)?;

    Ok(conn)
}

fn migrate_transactions_payment_method(conn: &Connection) -> Result<()> {
    let sql: String = conn.query_row(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'",
        [],
        |r| r.get(0),
    ).unwrap_or_default();

    // If the old CHECK constraint is still there, recreate the table without it
    if sql.contains("card") && sql.contains("transfer") && !sql.contains("shamcash") {
        conn.execute_batch("PRAGMA foreign_keys=OFF;")?;
        conn.execute_batch("
            BEGIN;
            ALTER TABLE transactions RENAME TO _transactions_old;
            CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale','rental')),
                customer_id TEXT NOT NULL,
                dress_id TEXT NOT NULL,
                price REAL NOT NULL,
                deposit REAL NOT NULL DEFAULT 0,
                remaining REAL NOT NULL DEFAULT 0,
                payment_method TEXT NOT NULL DEFAULT 'cash',
                status TEXT NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active','completed','cancelled')),
                rental_start TEXT,
                rental_end TEXT,
                return_date TEXT,
                employee_id TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (dress_id) REFERENCES dresses(id)
            );
            INSERT INTO transactions SELECT * FROM _transactions_old;
            DROP TABLE _transactions_old;
            CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_dress    ON transactions(dress_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(transaction_type);
            CREATE INDEX IF NOT EXISTS idx_transactions_status   ON transactions(status);
            CREATE INDEX IF NOT EXISTS idx_transactions_created  ON transactions(created_at);
            COMMIT;
        ")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    }
    Ok(())
}

fn seed_default_data(conn: &Connection) -> Result<()> {
    let now = Utc::now().to_rfc3339();

    // Admin user
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
    if user_count == 0 {
        let hashed = hash_password("admin123");
        conn.execute(
            "INSERT INTO users (id, name, username, password, role, active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
            params!["admin_owner", "المالك", "admin", hashed, "owner", &now, &now],
        )?;
    }

    // Quran verses
    let verse_count: i64 = conn.query_row("SELECT COUNT(*) FROM quran_verses", [], |r| r.get(0))?;
    if verse_count == 0 {
        let verses = [
            ("وَاللَّهُ يَرْزُقُ مَن يَشَاءُ بِغَيْرِ حِسَابٍ", "البقرة: 212"),
            ("إِنَّ مَعَ الْعُسْرِ يُسْرًا", "الشرح: 6"),
            ("وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ", "الطلاق: 2-3"),
            ("رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي", "طه: 25-26"),
            ("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "الفاتحة: 1"),
            ("حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", "آل عمران: 173"),
            ("وَبَشِّرِ الصَّابِرِينَ", "البقرة: 155"),
            ("إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", "التوبة: 120"),
        ];
        for (text, ref_) in verses.iter() {
            let vid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO quran_verses (id, text, reference) VALUES (?1, ?2, ?3)",
                params![vid, text, ref_],
            )?;
        }
    }

    // Sample dresses
    let dress_count: i64 = conn.query_row("SELECT COUNT(*) FROM dresses", [], |r| r.get(0))?;
    if dress_count == 0 {
        let dresses: &[(&str, &str, &str, &str, f64, &str)] = &[
            ("W001", "أبيض",  "38", "كلاسيكي",  350000.0, "حالة ممتازة"),
            ("W002", "كريمي", "40", "أميرة",     420000.0, ""),
            ("W003", "ذهبي",  "36", "فاخر",      580000.0, "مطرز يدوي"),
            ("W004", "وردي",  "42", "رومانسي",   290000.0, ""),
            ("W005", "أبيض",  "44", "بوهيمي",    310000.0, ""),
            ("W006", "فضي",   "38", "حديث",      450000.0, "ترتر فضي"),
            ("W007", "كريمي", "40", "شيك",       380000.0, ""),
            ("W008", "أبيض",  "36", "كلاسيكي",  320000.0, ""),
            ("W009", "ذهبي",  "42", "أميرة",     520000.0, "دانتيل فرنسي"),
            ("W010", "أبيض",  "40", "فاخر",      680000.0, "كريستالات سواروفسكي"),
            ("W011", "كريمي", "38", "رومانسي",   260000.0, ""),
            ("W012", "وردي",  "36", "حديث",      340000.0, ""),
            ("W013", "فضي",   "44", "شيك",       490000.0, "إضافة طرحة"),
            ("W014", "أبيض",  "42", "بوهيمي",    280000.0, ""),
            ("W015", "ذهبي",  "40", "فاخر",      750000.0, "حصري - قطعة واحدة"),
            ("W016", "أزرق",  "38", "حديث",      395000.0, "أزرق سماوي"),
            ("W017", "أحمر",  "40", "كلاسيكي",  430000.0, ""),
            ("W018", "أبيض",  "42", "شيك",       510000.0, "طراز إيطالي"),
        ];
        for (code, color, size, style, price, notes) in dresses {
            let did = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO dresses (id, code, status, color, size, style, price, notes, created_at, updated_at)
                 VALUES (?1, ?2, 'available', ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![did, code, color, size, style, price, notes, &now, &now],
            )?;
        }
    }

    // Sample customers
    let customer_count: i64 = conn.query_row("SELECT COUNT(*) FROM customers", [], |r| r.get(0))?;
    if customer_count == 0 {
        let customers: &[(&str, &str, &str)] = &[
            ("رنا محمد",   "0912345678", "دمشق - المزة"),
            ("سارة أحمد",  "0998765432", "دمشق - المالكي"),
            ("هدى حسن",    "0944556677", "حمص"),
            ("منى علي",    "0933221144", "حلب"),
            ("ريم سالم",   "0921112233", "دمشق - كفرسوسة"),
            ("لارا خالد",  "0966554433", "دمشق - باب توما"),
            ("دانا يوسف",  "0955443322", "اللاذقية"),
            ("نور أيوب",   "0988776655", "دمشق - القدم"),
            ("مي عمر",     "0977665544", "طرطوس"),
            ("رولا زيدان", "0911223344", "دمشق - جرمانا"),
        ];
        for (name, phone, address) in customers {
            let cid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, '', ?5, ?6)",
                params![cid, name, phone, address, &now, &now],
            )?;
        }
    }

    // Sample expenses
    let expense_count: i64 = conn.query_row("SELECT COUNT(*) FROM expenses", [], |r| r.get(0))?;
    if expense_count == 0 {
        let expenses: &[(&str, f64, &str, &str, &str)] = &[
            ("rent",        500000.0, "إيجار المحل — مايو 2026",          "2026-05-01", "monthly"),
            ("electricity",  45000.0, "فاتورة الكهرباء",                   "2026-05-03", "monthly"),
            ("salary",      200000.0, "راتب الموظفة سمر",                 "2026-05-01", "monthly"),
            ("salary",      180000.0, "راتب الموظف ياسر",                 "2026-05-01", "monthly"),
            ("cleaning",     30000.0, "تنظيف ثلاثة فساتين",               "2026-04-28", "none"),
            ("marketing",    60000.0, "إعلانات إنستغرام وفيسبوك",          "2026-04-25", "monthly"),
            ("maintenance",  25000.0, "صيانة مكيفات المحل",               "2026-04-20", "none"),
            ("other",        15000.0, "مستلزمات مكتبية وأكياس تغليف",     "2026-04-15", "none"),
            ("rent",        500000.0, "إيجار المحل — أبريل 2026",          "2026-04-01", "monthly"),
            ("electricity",  38000.0, "فاتورة الكهرباء — أبريل",           "2026-04-04", "monthly"),
        ];
        for (category, amount, description, date, recurring_type) in expenses {
            let eid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO expenses (id, category, amount, description, date, recurring, recurring_type, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8)",
                params![eid, category, amount, description, date, recurring_type, &now, &now],
            )?;
        }
    }

    // Sample reminders
    let reminder_count: i64 = conn.query_row("SELECT COUNT(*) FROM reminders", [], |r| r.get(0))?;
    if reminder_count == 0 {
        let reminders: &[(&str, &str, &str, &str, &str)] = &[
            ("pickup",  "استلام فستان رنا محمد",     "2026-05-08", "high",   "موعد استلام فستان الزفاف بعد التعديل"),
            ("return",  "إرجاع فستان هدى حسن",       "2026-05-12", "urgent", "موعد تسليم الفستان المستأجر"),
            ("return",  "إرجاع فستان منى علي",        "2026-05-09", "high",   "موعد إرجاع فستان W004"),
            ("payment", "تحصيل رسوم هدى حسن",        "2026-05-12", "normal", "المبلغ المتبقي 100,000 ل.س"),
            ("payment", "دفعة منى علي المتبقية",       "2026-05-09", "high",   "المبلغ المتبقي 70,000 ل.س"),
            ("cleaning","تنظيف W003 بعد الإرجاع",    "2026-05-13", "normal", "إرسال لمغسلة الفساتين"),
            ("pickup",  "استلام فستان لارا خالد",     "2026-05-18", "low",    "موعد الاستلام المتفق عليه"),
        ];
        for (rtype, title, date, priority, description) in reminders {
            let rid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO reminders (id, reminder_type, title, description, date, priority, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8)",
                params![rid, rtype, title, description, date, priority, &now, &now],
            )?;
        }
    }

    Ok(())
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','employee','cashier')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dresses (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available'
        CHECK(status IN ('available','reserved','rented','cleaning','sold')),
    color TEXT,
    size TEXT,
    style TEXT,
    price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    image_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale','rental')),
    customer_id TEXT NOT NULL,
    dress_id TEXT NOT NULL,
    price REAL NOT NULL,
    deposit REAL NOT NULL DEFAULT 0,
    remaining REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active','completed','cancelled')),
    rental_start TEXT,
    rental_end TEXT,
    return_date TEXT,
    employee_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (dress_id) REFERENCES dresses(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    delivery_number TEXT UNIQUE NOT NULL,
    supplier TEXT,
    delivery_date TEXT NOT NULL,
    total_cost REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_items (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    dress_id TEXT NOT NULL,
    cost REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (dress_id) REFERENCES dresses(id)
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    recurring INTEGER NOT NULL DEFAULT 0,
    recurring_type TEXT NOT NULL DEFAULT 'none',
    employee_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    reminder_type TEXT NOT NULL
        CHECK(reminder_type IN ('pickup','return','payment','cleaning')),
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK(priority IN ('low','normal','high','urgent')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','done','cancelled')),
    transaction_id TEXT,
    customer_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quran_verses (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    reference TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dresses_status   ON dresses(status);
CREATE INDEX IF NOT EXISTS idx_dresses_code     ON dresses(code);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dress    ON transactions(dress_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status   ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created  ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_reminders_date   ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
"#;
