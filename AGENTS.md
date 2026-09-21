# Project Rules & Architecture Memory

## Critical Database Architecture Rule
> **MANDATORY**: This project uses **MySQL** (cPanel / phpMyAdmin) as its database backend, NOT Supabase.
> - Always generate database scripts in pure **MySQL syntax** (e.g. `CREATE TABLE IF NOT EXISTS`, `DECIMAL(15,2)`, `DATETIME DEFAULT CURRENT_TIMESTAMP`, `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).
> - When giving SQL instructions to the user, always instruct them to import/run the `.sql` scripts in **phpMyAdmin / MySQL Database**.
> - The frontend abstraction `supabase` in `src/lib/supabaseClient.js` routes to `mysqlClient` when `VITE_DATA_BACKEND=mysql`.
> - Never mention Supabase SQL Editor or PostgreSQL specific types (like UUID v4, timestamptz, jsonb) to the user.

## Design & UI Aesthetics Rule
- Windows 7 Aero glossy action buttons: `.btn-theme`, `.btn-info`, `.btn-danger`.
- Primary emerald green theme color `#2e6f40`.
- MIS landscape green banner PDF & Excel exports with signature blocks.
- Report pages must only generate/show data when the user clicks the "Show" button.
