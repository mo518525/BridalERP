use rusqlite::{Connection, params};

#[derive(Debug, Clone)]
pub struct UserContext {
    pub id: String,
    pub name: String,
    pub role: String,
}

pub fn get_user_context(db: &Connection, user_id: &str) -> Result<UserContext, String> {
    db.query_row(
        "SELECT id, name, role, active FROM users WHERE id = ?1",
        params![user_id],
        |row| {
            let active: i64 = row.get(3)?;
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, active))
        },
    )
    .map_err(|_| "المستخدم غير موجود".to_string())
    .and_then(|(id, name, role, active)| {
        if active == 0 {
            return Err("الحساب غير مفعل".to_string());
        }
        Ok(UserContext { id, name, role })
    })
}

pub fn require_role(ctx: &UserContext, allowed: &[&str]) -> Result<(), String> {
    if allowed.contains(&ctx.role.as_str()) {
        Ok(())
    } else {
        Err("ليس لديك صلاحية لتنفيذ هذا الإجراء".to_string())
    }
}

pub fn require_owner(ctx: &UserContext) -> Result<(), String> {
    require_role(ctx, &["owner"])
}

pub fn require_can_transact(ctx: &UserContext) -> Result<(), String> {
    require_role(ctx, &["owner", "cashier"])
}

pub fn require_any(ctx: &UserContext) -> Result<(), String> {
    require_role(ctx, &["owner", "cashier", "employee"])
}
