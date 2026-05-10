# BridalERP — Setup Guide

## Requirements
- Node.js >= 18
- Rust (install from https://rustup.rs)
- Tauri v2 prerequisites for Windows: https://tauri.app/v2/guides/prerequisites

## Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Install Tauri CLI
npm install -g @tauri-apps/cli

# 3. Run in development mode
npm run tauri dev

# 4. Build for production
npm run tauri build
```

## Default Credentials
- Username: `admin`
- Password: `admin123`

## Roles
| Role     | Description |
|----------|-------------|
| owner    | Full access (finance, settings, users, reports) |
| employee | Operations only (sales, rentals, customers, inventory) |
| cashier  | Basic operations only |

## Features
- ✅ Arabic (RTL) / German (LTR) — toggle in settings
- ✅ Dark / Light mode
- ✅ Dashboard with live stats, Quran verse, clock
- ✅ Dress inventory with status machine
- ✅ Sales workflow with payment tracking
- ✅ Rental workflow with return dates & overdue alerts
- ✅ Customer management with history
- ✅ Expense tracking (owner only)
- ✅ Reminder system (auto-created on sale/rental)
- ✅ Activity log
- ✅ Financial reports with CSV export
- ✅ Deliveries tracking
- ✅ User management with role-based permissions
- ✅ SQLite local database (offline-first)
