# Employee Dashboard: Announcements + Todos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internal announcements (owner posts, employees read on dashboard) and personal todo lists (employees manage on their dashboard), replacing the owner-only dashboard view for non-owner roles.

**Architecture:** Two new SQLite tables added via migration in `db.rs`. Seven new Tauri commands in two new command files. Dashboard.tsx splits by role: owners see the existing dashboard, employees see a new `EmployeeDashboard` component. Owner can manage announcements from the bottom of `EmployeesPage`.

**Tech Stack:** Rust + rusqlite (backend), React + TypeScript + Framer Motion (frontend), glassmorphism UI via `glass()` helper and `tok()` tokens.

---

## File Map

| Action | File |
|---|---|
| Modify | `src-tauri/src/db.rs` — add 2 table migrations |
| Modify | `src-tauri/src/models.rs` — add `Announcement`, `EmployeeTodo` structs |
| Create | `src-tauri/src/commands/announcements.rs` |
| Create | `src-tauri/src/commands/todos.rs` |
| Modify | `src-tauri/src/commands/mod.rs` — expose new modules |
| Modify | `src-tauri/src/main.rs` — register 7 new commands |
| Modify | `src/types/index.ts` — add `Announcement`, `EmployeeTodo` interfaces |
| Modify | `src/lib/api.ts` — add `announcements` and `todos` API namespaces |
| Create | `src/modules/dashboard/EmployeeDashboard.tsx` |
| Modify | `src/modules/dashboard/Dashboard.tsx` — wrap with role split |
| Modify | `src/modules/employees/EmployeesPage.tsx` — add announcements panel to OwnerView |

---

## Task 1: Database migrations

**Files:**
- Modify: `src-tauri/src/db.rs`

- [ ] **Step 1: Add the two new tables as migrations**

In `src-tauri/src/db.rs`, after the existing column migrations (around line 36, before `seed_default_data`), add:

```rust
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
```

- [ ] **Step 2: Verify it compiles**

```powershell
cd c:\Users\moham\Desktop\BridalERP; cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-Object -Last 5
```

Expected: `Finished` with 0 errors (warnings OK).

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/db.rs
git commit -m "feat: add announcements and employee_todos tables"
```

---

## Task 2: Rust models

**Files:**
- Modify: `src-tauri/src/models.rs`

- [ ] **Step 1: Append two new structs at the bottom of `models.rs`**

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Announcement {
    pub id: String,
    pub title: String,
    pub body: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmployeeTodo {
    pub id: String,
    pub user_id: String,
    pub text: String,
    pub done: bool,
    pub created_at: String,
}
```

- [ ] **Step 2: Verify**

```powershell
cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-Object -Last 5
```

Expected: `Finished` with 0 errors.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/models.rs
git commit -m "feat: add Announcement and EmployeeTodo models"
```

---

## Task 3: Announcements commands

**Files:**
- Create: `src-tauri/src/commands/announcements.rs`

- [ ] **Step 1: Create the file**

```rust
use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::Announcement};

#[tauri::command]
pub fn get_announcements(state: tauri::State<'_, AppState>) -> Result<Vec<Announcement>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, title, body, created_by, created_at FROM announcements ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Announcement {
            id:         row.get(0)?,
            title:      row.get(1)?,
            body:       row.get(2)?,
            created_by: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

#[tauri::command]
pub fn create_announcement(
    state: tauri::State<'_, AppState>,
    title: String,
    body: Option<String>,
    user_id: String,
) -> Result<Announcement, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    if title.trim().is_empty() {
        return Err("العنوان مطلوب".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO announcements (id, title, body, created_by, created_at) VALUES (?1,?2,?3,?4,?5)",
        params![id, title.trim(), body, user_id, now],
    ).map_err(|e| e.to_string())?;

    Ok(Announcement { id, title: title.trim().to_string(), body, created_by: user_id, created_at: now })
}

#[tauri::command]
pub fn delete_announcement(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let ctx = crate::auth_guard::get_user_context(&db, &user_id)?;
    crate::auth_guard::require_owner(&ctx)?;

    db.execute("DELETE FROM announcements WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: Verify**

```powershell
cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-Object -Last 5
```

Expected: `Finished` with 0 errors (the module isn't exposed yet, so this is just a syntax check on the file itself — expose it in Task 5).

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src/commands/announcements.rs
git commit -m "feat: add announcement Tauri commands"
```

---

## Task 4: Todo commands

**Files:**
- Create: `src-tauri/src/commands/todos.rs`

- [ ] **Step 1: Create the file**

```rust
use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use crate::{AppState, models::EmployeeTodo};

#[tauri::command]
pub fn get_todos(state: tauri::State<'_, AppState>, user_id: String) -> Result<Vec<EmployeeTodo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, user_id, text, done, created_at FROM employee_todos WHERE user_id=?1 ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![user_id], |row| {
        Ok(EmployeeTodo {
            id:         row.get(0)?,
            user_id:    row.get(1)?,
            text:       row.get(2)?,
            done:       row.get::<_, i64>(3)? != 0,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rows)
}

#[tauri::command]
pub fn create_todo(
    state: tauri::State<'_, AppState>,
    user_id: String,
    text: String,
) -> Result<EmployeeTodo, String> {
    if text.trim().is_empty() {
        return Err("نص المهمة مطلوب".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO employee_todos (id, user_id, text, done, created_at) VALUES (?1,?2,?3,0,?4)",
        params![id, user_id, text.trim(), now],
    ).map_err(|e| e.to_string())?;

    Ok(EmployeeTodo { id, user_id, text: text.trim().to_string(), done: false, created_at: now })
}

#[tauri::command]
pub fn toggle_todo(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE employee_todos SET done = 1 - done WHERE id=?1 AND user_id=?2",
        params![id, user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_todo(
    state: tauri::State<'_, AppState>,
    id: String,
    user_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM employee_todos WHERE id=?1 AND user_id=?2",
        params![id, user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: Commit**

```powershell
git add src-tauri/src/commands/todos.rs
git commit -m "feat: add employee todo Tauri commands"
```

---

## Task 5: Wire commands into Rust

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add modules to `mod.rs`**

Append to `src-tauri/src/commands/mod.rs`:

```rust
pub mod announcements;
pub mod todos;
```

- [ ] **Step 2: Register in `main.rs` invoke_handler**

Inside `tauri::generate_handler![...]` in `main.rs`, add after the Calendar section:

```rust
            // Announcements
            commands::announcements::get_announcements,
            commands::announcements::create_announcement,
            commands::announcements::delete_announcement,
            // Todos
            commands::todos::get_todos,
            commands::todos::create_todo,
            commands::todos::toggle_todo,
            commands::todos::delete_todo,
```

- [ ] **Step 3: Verify compilation**

```powershell
cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-Object -Last 5
```

Expected: `Finished` with 0 errors.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/commands/mod.rs src-tauri/src/main.rs
git commit -m "feat: register announcements and todos commands"
```

---

## Task 6: TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append two new interfaces at the bottom of `src/types/index.ts`**

```typescript
export interface Announcement {
  id: string;
  title: string;
  body?: string;
  created_by: string;
  created_at: string;
}

export interface EmployeeTodo {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/types/index.ts
git commit -m "feat: add Announcement and EmployeeTodo TypeScript types"
```

---

## Task 7: API client methods

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add two import types to the existing import block**

In `src/lib/api.ts`, add `Announcement` and `EmployeeTodo` to the existing `import type { ... }` block:

```typescript
import type {
  User, Dress, Customer, Transaction, Expense,
  Reminder, ActivityLog, Delivery, DashboardStats,
  FinancialReport, FilterParams, HomeSummary, CalendarEvent,
  RecurringType, Announcement, EmployeeTodo,
} from '../types';
```

- [ ] **Step 2: Add two API namespaces inside the `api` object, after `calendar`**

```typescript
  announcements: {
    getAll: () => invoke<Announcement[]>('get_announcements'),
    create: (title: string, body?: string) =>
      invoke<Announcement>('create_announcement', { title, body, userId: getCurrentUserId() }),
    delete: (id: string) =>
      invoke<void>('delete_announcement', { id, userId: getCurrentUserId() }),
  },

  todos: {
    getAll: () => invoke<EmployeeTodo[]>('get_todos', { userId: getCurrentUserId() }),
    create: (text: string) =>
      invoke<EmployeeTodo>('create_todo', { userId: getCurrentUserId(), text }),
    toggle: (id: string) =>
      invoke<void>('toggle_todo', { id, userId: getCurrentUserId() }),
    delete: (id: string) =>
      invoke<void>('delete_todo', { id, userId: getCurrentUserId() }),
  },
```

- [ ] **Step 3: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```powershell
git add src/lib/api.ts
git commit -m "feat: add announcements and todos API client methods"
```

---

## Task 8: EmployeeDashboard component

**Files:**
- Create: `src/modules/dashboard/EmployeeDashboard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, CheckSquare, Plus, Trash2, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/formatters';
import type { Announcement, EmployeeTodo } from '../../types';

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.38)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.03), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

export function EmployeeDashboard() {
  const { theme, addToast, language } = useUIStore();
  const { user: me } = useAuthStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todos, setTodos] = useState<EmployeeTodo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.announcements.getAll().then(setAnnouncements).catch(console.error);
    api.todos.getAll().then(setTodos).catch(console.error);
  }, []);

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    try {
      const created = await api.todos.create(text);
      setTodos(prev => [...prev, created]);
      setNewTodo('');
      inputRef.current?.focus();
    } catch (e) { addToast('error', String(e)); }
  };

  const toggleTodo = async (id: string) => {
    try {
      await api.todos.toggle(id);
      setTodos(prev => prev.map(td => td.id === id ? { ...td, done: !td.done } : td));
    } catch (e) { addToast('error', String(e)); }
  };

  const deleteTodo = async (id: string) => {
    try {
      await api.todos.delete(id);
      setTodos(prev => prev.filter(td => td.id !== id));
    } catch (e) { addToast('error', String(e)); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="rounded-[24px] px-5 py-4"
        style={glass(isDark)}
      >
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: t.text1 }}>
          مرحباً، {me?.name}
        </h1>
        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', color: t.textMuted, marginTop: 2 }}>
          {new Date().toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">

        {/* Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-5"
          style={glass(isDark)}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{ color: t.gold }}><Megaphone size={17} /></span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
              إعلانات الإدارة
            </h2>
          </div>

          {announcements.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2" style={{ color: t.textFaint }}>
              <Megaphone size={32} className="opacity-25" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>لا توجد إعلانات حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {announcements.map((ann, i) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-[16px] px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.06)',
                      border: isDark ? '1px solid rgba(201,168,76,0.20)' : '1px solid rgba(201,168,76,0.18)',
                    }}
                  >
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: t.text1 }}>
                      {ann.title}
                    </p>
                    {ann.body && (
                      <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.text2, marginTop: 4, lineHeight: 1.6 }}>
                        {ann.body}
                      </p>
                    )}
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.63rem', color: t.textFaint, marginTop: 6 }}>
                      {formatDate(ann.created_at, language)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Todo list */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-5 flex flex-col"
          style={glass(isDark)}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{ color: t.gold }}><CheckSquare size={17} /></span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
              مهامي
            </h2>
            <span className="mr-auto text-xs px-2 py-0.5 rounded-full"
              style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: t.textMuted }}>
              {todos.filter(td => !td.done).length} متبقية
            </span>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              ref={inputRef}
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="أضف مهمة جديدة..."
              className="flex-1 rounded-[12px] px-3 py-2 text-sm outline-none"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
                color: t.text1,
              }}
            />
            <button
              onClick={addTodo}
              disabled={!newTodo.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-[12px] flex-shrink-0 disabled:opacity-40"
              style={{ background: 'rgba(201,168,76,0.18)', color: t.gold, border: '1px solid rgba(201,168,76,0.30)' }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Todo items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
            <AnimatePresence initial={false}>
              {todos.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2" style={{ color: t.textFaint }}>
                  <CheckSquare size={28} className="opacity-25" />
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem' }}>لا توجد مهام — أضف واحدة!</p>
                </div>
              )}
              {todos.map(td => (
                <motion.div
                  key={td.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 group"
                  style={{
                    background: td.done
                      ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.60)'),
                    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.80)',
                  }}
                >
                  <button
                    onClick={() => toggleTodo(td.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                    style={{
                      background: td.done ? 'rgba(16,185,129,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      border: td.done ? '1.5px solid rgba(16,185,129,0.50)' : (isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.12)'),
                      color: td.done ? '#10b981' : 'transparent',
                    }}
                  >
                    {td.done && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      color: td.done ? t.textFaint : t.text1,
                      textDecoration: td.done ? 'line-through' : 'none',
                    }}
                  >
                    {td.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(td.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: '#e05252' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no output.

- [ ] **Step 3: Commit**

```powershell
git add src/modules/dashboard/EmployeeDashboard.tsx
git commit -m "feat: add EmployeeDashboard component (announcements + todos)"
```

---

## Task 9: Split Dashboard.tsx by role

**Files:**
- Modify: `src/modules/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add import at the top of `Dashboard.tsx`**

After the existing imports, add:

```typescript
import { usePermissions } from '../../hooks/usePermissions';
import { EmployeeDashboard } from './EmployeeDashboard';
```

- [ ] **Step 2: Rename the existing export and add a role-split wrapper**

Find the existing `export function Dashboard()` declaration and rename it to `function OwnerDashboard()` (remove the `export` keyword).

Then append at the very bottom of the file:

```typescript
export function Dashboard() {
  const { isOwner } = usePermissions();
  return isOwner ? <OwnerDashboard /> : <EmployeeDashboard />;
}
```

- [ ] **Step 3: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no output.

- [ ] **Step 4: Commit**

```powershell
git add src/modules/dashboard/Dashboard.tsx
git commit -m "feat: split Dashboard by role — employees see EmployeeDashboard"
```

---

## Task 10: Announcements management panel in OwnerView

**Files:**
- Modify: `src/modules/employees/EmployeesPage.tsx`

- [ ] **Step 1: Add imports**

At the top of `EmployeesPage.tsx`, add to the lucide import line:
- `Megaphone` and `Send` (add alongside existing icons)

Add type import:
```typescript
import type { User, Transaction, Reminder, Announcement } from '../../types';
```

- [ ] **Step 2: Add announcements state and load to `OwnerView`**

Inside `OwnerView`, add to the existing state declarations:

```typescript
const [announcements, setAnnouncements] = useState<Announcement[]>([]);
const [annTitle, setAnnTitle]           = useState('');
const [annBody, setAnnBody]             = useState('');
const [annLoading, setAnnLoading]       = useState(false);
```

Add to the existing `load` function:

```typescript
api.announcements.getAll().then(setAnnouncements).catch(console.error);
```

- [ ] **Step 3: Add the `createAnnouncement` handler inside `OwnerView`**

```typescript
const createAnnouncement = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!annTitle.trim()) return;
  setAnnLoading(true);
  try {
    const created = await api.announcements.create(annTitle.trim(), annBody.trim() || undefined);
    setAnnouncements(prev => [created, ...prev]);
    setAnnTitle('');
    setAnnBody('');
    addToast('success', 'تم نشر الإعلان');
  } catch (e) { addToast('error', String(e)); }
  finally { setAnnLoading(false); }
};

const deleteAnnouncement = async (id: string) => {
  try {
    await api.announcements.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    addToast('success', 'تم حذف الإعلان');
  } catch (e) { addToast('error', String(e)); }
};
```

- [ ] **Step 4: Add the announcements panel JSX inside `OwnerView`'s return, after the employee grid/detail `</div>` and before the modals**

```tsx
{/* Announcements panel */}
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.10, type: 'spring', stiffness: 440, damping: 38 }}
  className="rounded-[24px] p-5"
  style={glass(isDark)}
>
  <div className="flex items-center gap-2.5 mb-4">
    <span style={{ color: t.gold }}><Megaphone size={17} /></span>
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
      إعلانات الموظفين
    </h2>
  </div>

  {/* Create form */}
  <form onSubmit={createAnnouncement} className="space-y-2 mb-4">
    <input
      value={annTitle}
      onChange={e => setAnnTitle(e.target.value)}
      placeholder="عنوان الإعلان..."
      required
      className="w-full rounded-[12px] px-3 py-2 text-sm outline-none"
      style={{
        fontFamily: 'Cairo, sans-serif',
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
        color: t.text1,
      }}
    />
    <textarea
      value={annBody}
      onChange={e => setAnnBody(e.target.value)}
      placeholder="تفاصيل إضافية (اختياري)..."
      rows={2}
      className="w-full rounded-[12px] px-3 py-2 text-sm outline-none resize-none"
      style={{
        fontFamily: 'Cairo, sans-serif',
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
        color: t.text1,
      }}
    />
    <button
      type="submit"
      disabled={annLoading || !annTitle.trim()}
      className="flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold disabled:opacity-40"
      style={{
        fontFamily: 'Cairo, sans-serif',
        background: 'rgba(201,168,76,0.18)',
        color: t.gold,
        border: '1px solid rgba(201,168,76,0.30)',
      }}
    >
      <Send size={13} />
      {annLoading ? 'جاري النشر...' : 'نشر الإعلان'}
    </button>
  </form>

  {/* Existing announcements */}
  <div className="space-y-2">
    <AnimatePresence initial={false}>
      {announcements.length === 0 && (
        <p className="text-center py-4" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem', color: t.textFaint }}>
          لا توجد إعلانات منشورة
        </p>
      )}
      {announcements.map(ann => (
        <motion.div
          key={ann.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 16 }}
          className="flex items-start gap-3 rounded-[14px] px-4 py-3"
          style={{
            background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.05)',
            border: isDark ? '1px solid rgba(201,168,76,0.18)' : '1px solid rgba(201,168,76,0.15)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: t.text1 }}>{ann.title}</p>
            {ann.body && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.76rem', color: t.text2, marginTop: 2 }}>{ann.body}</p>}
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.62rem', color: t.textFaint, marginTop: 4 }}>{formatDate(ann.created_at, language)}</p>
          </div>
          <button
            onClick={() => deleteAnnouncement(ann.id)}
            className="flex-shrink-0 mt-0.5"
            style={{ color: '#e05252', opacity: 0.7 }}
          >
            <Trash2 size={14} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
</motion.div>
```

- [ ] **Step 5: Add missing imports — `language` from `useUIStore` in `OwnerView`**

In `OwnerView`, destructure `language` from `useUIStore`:

```typescript
const { theme, addToast, language } = useUIStore();
```

- [ ] **Step 6: TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no output.

- [ ] **Step 7: Commit**

```powershell
git add src/modules/employees/EmployeesPage.tsx
git commit -m "feat: add announcements panel to OwnerView in EmployeesPage"
```

---

## Task 11: Final verification and push

- [ ] **Step 1: Full Rust check**

```powershell
cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-Object -Last 8
```

Expected: `Finished` with 0 errors.

- [ ] **Step 2: Full TypeScript check**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no output.

- [ ] **Step 3: Push to GitHub**

```powershell
git push origin master
```
