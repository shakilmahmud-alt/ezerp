-- ============================================================
-- EG ERP: ACCOUNTS MANAGEMENT MODULE MYSQL SCHEMA
-- Database Engine: MySQL / MariaDB (phpMyAdmin / cPanel)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Table structure for `accounts_chart` (Chart of Accounts)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_chart` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Income', 'Expense'
  `parent_code` VARCHAR(50) DEFAULT NULL,
  `balance` DECIMAL(15,2) DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Chart of Accounts Seed Data
INSERT IGNORE INTO `accounts_chart` (`id`, `code`, `name`, `type`, `parent_code`, `created_at`) VALUES
('coa-1000', '1000', 'ASSETS', 'Asset', NULL, NOW()),
('coa-1100', '1100', 'Current Assets', 'Asset', '1000', NOW()),
('coa-1110', '1110', 'Cash in Hand', 'Asset', '1100', NOW()),
('coa-1120', '1120', 'Cash at Bank', 'Asset', '1100', NOW()),
('coa-1130', '1130', 'Accounts Receivable', 'Asset', '1100', NOW()),
('coa-1140', '1140', 'Inventory / Merchandise Stock', 'Asset', '1100', NOW()),
('coa-1200', '1200', 'Fixed Assets (Showroom, IT & Furniture)', 'Asset', '1000', NOW()),
('coa-2000', '2000', 'LIABILITIES', 'Liability', NULL, NOW()),
('coa-2100', '2100', 'Current Liabilities', 'Liability', '2000', NOW()),
('coa-2110', '2110', 'Accounts Payable', 'Liability', '2100', NOW()),
('coa-2120', '2120', 'After-Sale Consignment Payable', 'Liability', '2100', NOW()),
('coa-2130', '2130', 'Salaries & Wages Payable', 'Liability', '2100', NOW()),
('coa-2140', '2140', 'VAT & Tax Payable', 'Liability', '2100', NOW()),
('coa-3000', '3000', 'EQUITY', 'Equity', NULL, NOW()),
('coa-3100', '3100', 'Owner Capital', 'Equity', '3000', NOW()),
('coa-3200', '3200', 'Retained Earnings', 'Equity', '3000', NOW()),
('coa-4000', '4000', 'INCOME / REVENUE', 'Income', NULL, NOW()),
('coa-4100', '4100', 'Sales Revenue (POS & Central)', 'Income', '4000', NOW()),
('coa-4200', '4200', 'Discount Received from Vendors', 'Income', '4000', NOW()),
('coa-4300', '4300', 'Other Operating Income', 'Income', '4000', NOW()),
('coa-5000', '5000', 'EXPENSES', 'Expense', NULL, NOW()),
('coa-5100', '5100', 'Cost of Goods Sold (Purchases)', 'Expense', '5000', NOW()),
('coa-5200', '5200', 'Operating Expenses', 'Expense', '5000', NOW()),
('coa-5210', '5210', 'Salaries & Staff Benefits', 'Expense', '5200', NOW()),
('coa-5220', '5220', 'Rent & Office Utilities', 'Expense', '5200', NOW()),
('coa-5230', '5230', 'Transport & Logistics', 'Expense', '5200', NOW()),
('coa-5240', '5240', 'Marketing & Promotions', 'Expense', '5200', NOW()),
('coa-5250', '5250', 'Office Stationery & Entertainment', 'Expense', '5200', NOW()),
('coa-5260', '5260', 'Depreciation & Amortization', 'Expense', '5200', NOW());

-- --------------------------------------------------------
-- 2. Table structure for `accounts_bank_accounts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_bank_accounts` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `account_name` VARCHAR(255) NOT NULL,
  `account_type` VARCHAR(50) DEFAULT 'Bank', -- 'Bank' | 'Cash' | 'Mobile Banking'
  `bank_name` VARCHAR(255) DEFAULT NULL,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `branch` VARCHAR(255) DEFAULT NULL,
  `initial_balance` DECIMAL(15,2) DEFAULT 0.00,
  `current_balance` DECIMAL(15,2) DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Bank & Cash Accounts (Default 0.00 balances, dynamically calculated)
INSERT IGNORE INTO `accounts_bank_accounts` (`id`, `account_name`, `account_type`, `bank_name`, `account_number`, `branch`, `initial_balance`, `current_balance`, `created_at`) VALUES
('bank-1', 'Cash in Hand (Main Drawer)', 'Cash', 'Main Cash', 'CASH-001', 'Head Office', 0.00, 0.00, NOW()),
('bank-2', 'Islami Bank Bangladesh Ltd (CD)', 'Bank', 'IBBL', '20501450200345678', 'Dhanmondi Branch', 0.00, 0.00, NOW()),
('bank-3', 'Dutch-Bangla Bank Ltd (Current)', 'Bank', 'DBBL', '1171100098765', 'Banani Branch', 0.00, 0.00, NOW()),
('bank-4', 'bKash Merchant Account', 'Mobile Banking', 'bKash', '01711000000', 'Corporate Wallet', 0.00, 0.00, NOW());

-- --------------------------------------------------------
-- 3. Table structure for `accounts_expense_categories`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_expense_categories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Categories
INSERT IGNORE INTO `accounts_expense_categories` (`id`, `code`, `name`, `created_at`) VALUES
('cat-1', 'EXP-001', 'Showroom & Office Rent', NOW()),
('cat-2', 'EXP-002', 'Electricity & Utility Bills', NOW()),
('cat-3', 'EXP-003', 'Transportation & Conveyance', NOW()),
('cat-4', 'EXP-004', 'Entertainment & Refreshment', NOW()),
('cat-5', 'EXP-005', 'Marketing & Promotions', NOW()),
('cat-6', 'EXP-006', 'Office Supplies & Stationery', NOW()),
('cat-7', 'EXP-007', 'Maintenance & Repairs', NOW()),
('cat-8', 'EXP-008', 'Internet & Telephone', NOW()),
('cat-9', 'EXP-009', 'Staff Welfare & Medical', NOW()),
('cat-10', 'EXP-010', 'Government Taxes & Fees', NOW());

-- --------------------------------------------------------
-- 4. Table structure for `accounts_expenses`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_expenses` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `expense_date` DATE NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `category_id` VARCHAR(64) DEFAULT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(50) DEFAULT 'Cash',
  `bank_account_name` VARCHAR(255) DEFAULT NULL,
  `bank_account_id` VARCHAR(64) DEFAULT NULL,
  `payee` VARCHAR(255) DEFAULT NULL,
  `reference_no` VARCHAR(100) DEFAULT NULL,
  `voucher_no` VARCHAR(100) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table structure for `accounts_vouchers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_vouchers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `voucher_no` VARCHAR(100) UNIQUE NOT NULL,
  `voucher_type` VARCHAR(50) NOT NULL, -- 'Debit Voucher (Payment)', 'Credit Voucher (Receipt)', 'Journal Voucher', 'Contra Voucher'
  `voucher_date` DATE NOT NULL,
  `debit_account` VARCHAR(255) NOT NULL,
  `credit_account` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(50) DEFAULT 'Cash',
  `bank_account_name` VARCHAR(255) DEFAULT NULL,
  `bank_account_id` VARCHAR(64) DEFAULT NULL,
  `reference_no` VARCHAR(100) DEFAULT NULL,
  `cheque_no` VARCHAR(100) DEFAULT NULL,
  `narration` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table structure for `accounts_vendor_payments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_vendor_payments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `payment_date` DATE NOT NULL,
  `vendor_id` VARCHAR(64) NOT NULL,
  `vendor_name` VARCHAR(255) DEFAULT NULL,
  `purchase_receive_id` VARCHAR(64) DEFAULT NULL,
  `challan_no` VARCHAR(100) DEFAULT NULL,
  `purchase_type` VARCHAR(50) DEFAULT NULL, -- 'CashPurchase', 'CreditPurchase', 'AfterSale'
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(50) DEFAULT 'Cash',
  `bank_account_name` VARCHAR(255) DEFAULT NULL,
  `bank_account_id` VARCHAR(64) DEFAULT NULL,
  `voucher_no` VARCHAR(100) DEFAULT NULL,
  `reference_no` VARCHAR(100) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table structure for `accounts_customer_collections`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_customer_collections` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `collection_date` DATE NOT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `sale_id` VARCHAR(64) DEFAULT NULL,
  `invoice_no` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(50) DEFAULT 'Cash',
  `bank_account_name` VARCHAR(255) DEFAULT NULL,
  `bank_account_id` VARCHAR(64) DEFAULT NULL,
  `voucher_no` VARCHAR(100) DEFAULT NULL,
  `reference_no` VARCHAR(100) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table structure for `accounts_salaries`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts_salaries` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `month_year` VARCHAR(20) NOT NULL, -- e.g. '2026-09'
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_code` VARCHAR(50) DEFAULT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `basic_salary` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `bonus_amount` DECIMAL(15,2) DEFAULT 0.00,
  `deduction_amount` DECIMAL(15,2) DEFAULT 0.00,
  `net_salary` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(50) DEFAULT 'Pending', -- 'Pending' | 'Paid'
  `payment_date` DATE DEFAULT NULL,
  `payment_mode` VARCHAR(50) DEFAULT 'Cash',
  `bank_account_name` VARCHAR(255) DEFAULT NULL,
  `bank_account_id` VARCHAR(64) DEFAULT NULL,
  `voucher_no` VARCHAR(100) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Ensure Purchase Tables have supplier_payment_type
-- --------------------------------------------------------
-- Note: If running on existing MySQL table, add column:
-- ALTER TABLE `purchase_orders` ADD COLUMN `supplier_payment_type` VARCHAR(50) DEFAULT 'CashPurchase';
-- ALTER TABLE `purchase_receives` ADD COLUMN `supplier_payment_type` VARCHAR(50) DEFAULT 'CashPurchase';
