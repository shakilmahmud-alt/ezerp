# Database Rules for EZ ERP

- **Database Engine**: **MySQL** (cPanel / phpMyAdmin / MariaDB).
- **No Supabase**: Do not ask the user to use Supabase SQL Editor. Always provide MySQL scripts and instructions for phpMyAdmin.
- **SQL Scripts**: Must use MySQL DDL syntax (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`, `AUTO_INCREMENT` or `VARCHAR(64)` for IDs, `DECIMAL(15,2)`, `DATETIME DEFAULT CURRENT_TIMESTAMP`).
