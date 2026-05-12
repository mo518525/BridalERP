pub fn validate_price(price: f64, field: &str) -> Result<(), String> {
    if price < 0.0 {
        return Err(format!("{} يجب أن يكون أكبر من أو يساوي صفر", field));
    }
    Ok(())
}

pub fn validate_deposit(deposit: f64, price: f64) -> Result<(), String> {
    if deposit < 0.0 {
        return Err("المقدم يجب أن يكون أكبر من أو يساوي صفر".to_string());
    }
    if deposit > price {
        return Err("المقدم لا يمكن أن يتجاوز السعر الكلي".to_string());
    }
    Ok(())
}

pub fn validate_date_range(start: &str, end: &str) -> Result<(), String> {
    if end <= start {
        return Err("تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية".to_string());
    }
    Ok(())
}

pub fn validate_not_empty(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{} لا يمكن أن يكون فارغاً", field));
    }
    Ok(())
}

pub fn validate_role(role: &str) -> Result<(), String> {
    match role {
        "owner" | "employee" | "cashier" => Ok(()),
        _ => Err(format!("دور غير صالح: {}", role)),
    }
}

pub fn validate_payment_method(method: &str) -> Result<(), String> {
    match method {
        "cash" | "card" | "transfer" => Ok(()),
        _ => Err(format!("طريقة دفع غير صالحة: {}", method)),
    }
}

pub fn validate_expense_category(category: &str) -> Result<(), String> {
    match category {
        "rent" | "electricity" | "salary" | "cleaning" | "marketing" | "maintenance" | "other" => Ok(()),
        _ => Err(format!("تصنيف غير صالح: {}", category)),
    }
}

pub fn validate_reminder_type(rt: &str) -> Result<(), String> {
    if rt.trim().is_empty() {
        Err("نوع التذكير لا يمكن أن يكون فارغاً".to_string())
    } else {
        Ok(())
    }
}

pub fn validate_reminder_priority(p: &str) -> Result<(), String> {
    match p {
        "low" | "normal" | "high" | "urgent" => Ok(()),
        _ => Err(format!("أولوية غير صالحة: {}", p)),
    }
}

pub fn validate_price_strict(price: f64, field: &str) -> Result<(), String> {
    if price <= 0.0 {
        return Err(format!("{} يجب أن يكون أكبر من صفر", field));
    }
    Ok(())
}
