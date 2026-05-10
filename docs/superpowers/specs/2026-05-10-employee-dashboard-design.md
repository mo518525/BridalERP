# Employee Dashboard: Announcements + Todo List

**Date:** 2026-05-10
**Status:** Approved

## Overview

Two features added to the BridalERP employees workflow:

1. **Announcements** — Owner posts internal messages visible to all employees. Managed from the Employees page (owner side). Displayed on the Dashboard page for employees.
2. **Todo List** — Each employee manages their own personal todo items, shown on the Dashboard page instead of the owner-only stats dashboard.

Employees currently can navigate to `/dashboard` but see the full owner dashboard — this feature gates that route so employees see a dedicated view instead.

---

## Role Behavior

| Route | Owner | Employee / Cashier |
|---|---|---|
| `/dashboard` | Existing dashboard (unchanged) | New EmployeeDashboard (announcements + todos) |
| `/employees` | Full management + announcements panel | Own profile view (unchanged) |

---

## Data Model

### Table: `announcements`

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL
);
```

### Table: `employee_todos`

```sql
CREATE TABLE IF NOT EXISTS employee_todos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  text        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
```

Both tables are added via a migration block in `db::init_db` (same pattern as existing tables).

---

## Rust Commands

All commands live in new files: `src-tauri/src/commands/announcements.rs` and `src-tauri/src/commands/todos.rs`. Both are registered in `main.rs` and exposed in `src/lib/api.ts`.

### Announcements

| Command | Args | Returns | Auth |
|---|---|---|---|
| `get_announcements` | — | `Vec<Announcement>` | any logged-in user |
| `create_announcement` | `title, body, user_id` | `Announcement` | owner only |
| `delete_announcement` | `id, user_id` | `()` | owner only |

### Todos

| Command | Args | Returns | Auth |
|---|---|---|---|
| `get_todos` | `user_id` | `Vec<EmployeeTodo>` | own user_id only |
| `create_todo` | `user_id, text` | `EmployeeTodo` | own user_id only |
| `toggle_todo` | `id, user_id` | `()` | own user_id only |
| `delete_todo` | `id, user_id` | `()` | own user_id only |

---

## Models

```rust
// models.rs additions
pub struct Announcement {
    pub id: String,
    pub title: String,
    pub body: Option<String>,
    pub created_by: String,
    pub created_at: String,
}

pub struct EmployeeTodo {
    pub id: String,
    pub user_id: String,
    pub text: String,
    pub done: bool,
    pub created_at: String,
}
```

---

## Frontend

### `src/modules/dashboard/Dashboard.tsx`

Wrap the existing content so non-owners see `EmployeeDashboard` instead:

```tsx
export function Dashboard() {
  const { isOwner } = usePermissions();
  return isOwner ? <OwnerDashboard /> : <EmployeeDashboard />;
}
```

`OwnerDashboard` = current `Dashboard` component, renamed.  
`EmployeeDashboard` = new component (see below).

### `EmployeeDashboard` layout

```
┌──────────────────────────────────────────────┐
│  📣 إعلانات الإدارة                           │
│  ┌────────────────────────────────────────┐  │
│  │ [title]  [body]  [date]                │  │
│  │ [title]  [body]  [date]                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ✅ مهامي اليوم                              │
│  ┌────────────────────────────────────────┐  │
│  │ ☐ todo item text              [delete] │  │
│  │ ☑ done item (strikethrough)   [delete] │  │
│  └────────────────────────────────────────┘  │
│  [+ إضافة مهمة]                              │
└──────────────────────────────────────────────┘
```

- Glassmorphism cards, same design tokens as existing pages
- Announcements: read-only list sorted newest-first, empty state if none
- Todos: inline `<input>` to add, click item to toggle done (strikethrough), trash icon to delete
- Both panels load on mount, todos re-fetch after any mutation

### `src/modules/employees/EmployeesPage.tsx` (OwnerView)

Add an **Announcements panel** below the employee grid:

- Text fields for title + optional body
- Submit button → `api.announcements.create()`
- List of existing announcements with delete button per item
- Framer Motion entrance animation, same glass styling

### `src/lib/api.ts`

```ts
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

### `src/types/index.ts`

Add `Announcement` and `EmployeeTodo` interfaces matching the Rust models.

---

## Error Handling

- All Rust commands return `Result<T, String>` — error strings are Arabic.
- Frontend catches errors with `addToast('error', ...)` as per existing pattern.
- `create_todo`: reject empty or whitespace-only text at the Rust level.
- `delete_announcement`: only owner can delete (checked via `auth_guard::require_owner`).

---

## Out of Scope

- Announcements are not push notifications — employees see them on next visit to `/dashboard`.
- No read/unread tracking.
- No announcement editing — owner deletes and re-creates.
- Todo items are personal and not visible to the owner.
- No due dates on todos.
