-- ========================================================
-- EG ERP Complete Database Migration Export for cPanel MySQL
-- Database: holidaym_ezerp
-- Generated Date: 2026-08-25T06:12:49.998Z
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `areas`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `areas`;
CREATE TABLE `areas` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `areas` (4 rows)
INSERT INTO `areas` (`id`, `code`, `name`, `created_at`) VALUES
('645fa0f4-7c18-46e9-b0ad-25f8c90f60d7', 'A0001', 'Banani', '2026-07-11T05:01:07.828097+00:00'),
('d55bdb89-7557-4354-9e34-a39c63dd8840', 'A0002', 'Gulshan', '2026-07-11T05:05:51.857784+00:00'),
('1fee0778-046a-4eca-bfd2-7fbaa2983c60', 'A0003', 'Dhanmondi', '2026-07-11T05:06:00.854779+00:00'),
('b33c1a2f-8946-4cfd-96c0-2632c318f68d', 'A0004', 'Uttara', '2026-07-11T05:06:05.95787+00:00');

-- --------------------------------------------------------
-- Table structure for table `brands`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` LONGTEXT,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `brands` (5 rows)
INSERT INTO `brands` (`id`, `sl`, `code`, `name`, `description`, `created_at`) VALUES
('b1d5cb6e-a97c-4263-b435-227e5998663a', 1, '0001', 'Avent', '', '2026-06-23T07:23:44.697284+00:00'),
('b4ca6e81-facb-48ab-9468-2d7117d50544', 2, '0002', 'EG', '', '2026-06-23T09:41:48.864916+00:00'),
('a1871955-a2b0-4bc2-b65d-e509f96f5a1d', 3, '0003', 'LIONEL SPORTS', '', '2026-08-25T04:15:20.40833+00:00'),
('0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 4, '0004', 'JACKY BABY', '', '2026-08-25T04:15:20.640891+00:00'),
('fa210645-baa9-4b75-adbd-2a0884db635f', 5, '0005', 'BAOLI', '', '2026-08-25T04:15:20.865295+00:00');

-- --------------------------------------------------------
-- Table structure for table `categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` LONGTEXT,
  `vat` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `categories` (4 rows)
INSERT INTO `categories` (`id`, `sl`, `code`, `name`, `description`, `vat`, `created_at`) VALUES
('12dbfa92-ebe8-4a61-bdf1-df66b340bb3b', 2, '002', 'Baby Feeding', '', '7.5', '2026-06-23T06:57:18.448394+00:00'),
('64f1cd61-9e0d-4456-a639-2f1cd048eaca', 1, '001', 'Sandal & Shoes', '', '7.5', '2026-06-23T06:56:45.107777+00:00'),
('48ad6a1b-0788-4df2-aa64-6af5cd601747', 3, '003', 'Faruk', 'CSE', '5', '2026-06-29T09:55:39.525407+00:00'),
('f6180931-abb9-4781-ab6a-8314d2ce1a49', 4, '004', 'Toys', '', '7.5', '2026-08-25T04:15:18.202499+00:00');

-- --------------------------------------------------------
-- Table structure for table `customer_types`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `customer_types`;
CREATE TABLE `customer_types` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `promo_price` VARCHAR(255),
  `scan_card_on_sale` TINYINT(1) DEFAULT 1,
  `send_sms_to_customer` TINYINT(1) DEFAULT 1,
  `visible_in_pos` TINYINT(1) DEFAULT 1,
  `other_promotion_applicable` TINYINT(1) DEFAULT 1,
  `accounts_head_creation` TINYINT(1) DEFAULT 1,
  `welcome_sms` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64),
  `earning_point` DECIMAL(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `customer_types` (2 rows)
INSERT INTO `customer_types` (`id`, `code`, `name`, `discount_percent`, `promo_price`, `scan_card_on_sale`, `send_sms_to_customer`, `visible_in_pos`, `other_promotion_applicable`, `accounts_head_creation`, `welcome_sms`, `created_at`, `updated_at`, `earning_point`) VALUES
('4d7768ce-0d2c-457f-9b0e-5cc6c9fd9b19', '002', 'SILVER', 0, 'MRP', 0, 0, 1, 1, 0, 0, '2026-06-28T11:01:48.627812+00:00', '2026-06-28T11:01:48.627812+00:00', 2),
('731ec59d-a7a5-4853-9f30-fafdd2f97acc', '001', 'GOLD', 5, 'MRP', 0, 0, 1, 1, 0, 0, '2026-06-28T11:01:21.876067+00:00', '2026-06-28T11:01:21.876067+00:00', 4);

-- --------------------------------------------------------
-- Table structure for table `customers`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `customer_type_id` VARCHAR(64),
  `gender` VARCHAR(255),
  `first_name` VARCHAR(255),
  `middle_name` VARCHAR(255),
  `last_name` VARCHAR(255),
  `dob` VARCHAR(64),
  `enrollment_date` VARCHAR(64),
  `expire_date` VARCHAR(64),
  `contact_no` VARCHAR(255),
  `alt_contact_no` VARCHAR(255),
  `email` VARCHAR(255),
  `card_no` VARCHAR(255),
  `address` LONGTEXT,
  `shipping_address` LONGTEXT,
  `country` VARCHAR(255),
  `city` VARCHAR(255),
  `postal_code` VARCHAR(255),
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `special_date` VARCHAR(64),
  `special_date_note` LONGTEXT,
  `salesperson` VARCHAR(255),
  `store` VARCHAR(255),
  `wholesale_customer` TINYINT(1) DEFAULT 1,
  `sale_without_vat` TINYINT(1) DEFAULT 1,
  `credit_customer` TINYINT(1) DEFAULT 1,
  `credit_limit` DECIMAL(15,2) DEFAULT 0.00,
  `store_customer` TINYINT(1) DEFAULT 1,
  `inactive` TINYINT(1) DEFAULT 1,
  `vat_reg_no` VARCHAR(255),
  `nid` VARCHAR(255),
  `tin` VARCHAR(255),
  `ref_person_name` VARCHAR(255),
  `ref_company` VARCHAR(255),
  `ref_designation` VARCHAR(255),
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `customers` (3 rows)
INSERT INTO `customers` (`id`, `code`, `customer_type_id`, `gender`, `first_name`, `middle_name`, `last_name`, `dob`, `enrollment_date`, `expire_date`, `contact_no`, `alt_contact_no`, `email`, `card_no`, `address`, `shipping_address`, `country`, `city`, `postal_code`, `discount_percent`, `special_date`, `special_date_note`, `salesperson`, `store`, `wholesale_customer`, `sale_without_vat`, `credit_customer`, `credit_limit`, `store_customer`, `inactive`, `vat_reg_no`, `nid`, `tin`, `ref_person_name`, `ref_company`, `ref_designation`, `created_at`, `updated_at`) VALUES
('0dba2097-4439-4aa7-9dea-44c362299d9a', '100001', '4d7768ce-0d2c-457f-9b0e-5cc6c9fd9b19', 'Female', 'Somaya', NULL, NULL, NULL, '2026-06-29', '2099-12-31', '01776899365', NULL, NULL, '100001', 'Dhaka', NULL, 'BD', 'Dhaka', NULL, 0, NULL, NULL, NULL, 'Shop', 0, 0, 0, 0, 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-29T06:25:32.06447+00:00', '2026-06-29T06:25:32.06447+00:00'),
('3fcf2668-2ac5-485f-aa37-3eeb2f1fb91a', '100002', '4d7768ce-0d2c-457f-9b0e-5cc6c9fd9b19', 'Male', 'Mr.X', NULL, NULL, '2000-07-01', '2026-07-15', '2099-12-31', '0123456789', NULL, NULL, '100002', 'Banani', NULL, 'BD', 'Dhaka', NULL, 0, NULL, NULL, NULL, '35babb6b-cdfb-4c61-840b-38810b5f3948', 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-15T03:38:52.606437+00:00', '2026-07-15T03:38:52.606437+00:00'),
('09c2120a-2eda-43b5-b5b5-04d7349d03e9', '100003', '731ec59d-a7a5-4853-9f30-fafdd2f97acc', 'Female', 'Faruk', NULL, 'Hossain', NULL, '2026-08-21', NULL, '01919273242', NULL, 'farukhossainkpbd@gmail.com', '100003', 'KA-244, Kuril, Progoti Shoroni', NULL, 'BD', 'Dhaka', NULL, 5, NULL, NULL, NULL, '35babb6b-cdfb-4c61-840b-38810b5f3948', 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, '2026-08-21T12:14:48.728741+00:00', '2026-08-21T12:14:48.728741+00:00');

-- --------------------------------------------------------
-- Table structure for table `damage_and_lost`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `damage_and_lost`;
CREATE TABLE `damage_and_lost` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `reference_no` VARCHAR(255),
  `dml_date` VARCHAR(64),
  `total_qty` INT DEFAULT 0,
  `total_value` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `damage_and_lost` (2 rows)
INSERT INTO `damage_and_lost` (`id`, `reference_no`, `dml_date`, `total_qty`, `total_value`, `created_at`) VALUES
('e67667d4-9e6f-4718-9432-e17c8d6732bc', 'CN20260627001', '2026-06-27', 2, 820, '2026-06-27T04:00:18.195021+00:00'),
('0be5ef2f-6c2e-40b1-99a6-2f3466fcf8c2', 'CN20260627001', '2026-06-27', 2, 820, '2026-06-27T04:01:27.989152+00:00');

-- --------------------------------------------------------
-- Table structure for table `damage_and_lost_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `damage_and_lost_items`;
CREATE TABLE `damage_and_lost_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `damage_and_lost_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `barcode` VARCHAR(255),
  `cpu` DECIMAL(15,2) DEFAULT 0.00,
  `sale_price` DECIMAL(15,2) DEFAULT 0.00,
  `dml_qty` INT DEFAULT 0,
  `amount` DECIMAL(15,2) DEFAULT 0.00,
  `reason` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `damage_and_lost_items` (2 rows)
INSERT INTO `damage_and_lost_items` (`id`, `damage_and_lost_id`, `product_id`, `barcode`, `cpu`, `sale_price`, `dml_qty`, `amount`, `reason`) VALUES
('d4f3c75a-7228-4771-9f9b-34f1c89e1fb5', 'e67667d4-9e6f-4718-9432-e17c8d6732bc', 'bd212d7c-abe6-4801-8365-81fcf94559c7', '1001100002', 410, 742, 2, 820, 'Product torned'),
('4613fe99-8413-4acf-bad3-733f088e6794', '0be5ef2f-6c2e-40b1-99a6-2f3466fcf8c2', 'bd212d7c-abe6-4801-8365-81fcf94559c7', '1001100002', 410, 742, 2, 820, 'damaged');

-- --------------------------------------------------------
-- Table structure for table `designations`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `designations`;
CREATE TABLE `designations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `designations` (7 rows)
INSERT INTO `designations` (`id`, `code`, `name`, `created_at`) VALUES
('87af4e81-eaec-434b-9c3d-6e1f23534c6c', 'DG0001', 'IT Manager', '2026-07-11T06:20:22.717423+00:00'),
('e56619f5-5aef-4cd4-b70d-da03968165be', 'DG0002', 'IT Executive', '2026-07-11T06:21:54.929938+00:00'),
('67d0e8fe-a43f-48a3-aaae-746f8b4fc03f', 'DG0003', 'Accounts Manager', '2026-07-11T06:22:02.303869+00:00'),
('92f0e603-b671-40ff-8843-01d29f2c36c4', 'DG0004', 'Data Entry', '2026-07-11T06:22:15.335788+00:00'),
('f0416357-dffd-450e-acad-5a70c30a0cd7', 'DG0005', 'POS Executive', '2026-07-11T06:22:28.742711+00:00'),
('e9391920-4cdb-414c-b5f1-04eb3eb657f5', 'DG0006', 'Cashier', '2026-07-11T06:22:39.301702+00:00'),
('afa25aa9-aeef-42a6-a3be-4dc0874b0050', 'DG0007', 'Sales Executive', '2026-07-11T06:22:58.613976+00:00');

-- --------------------------------------------------------
-- Table structure for table `employee_stores`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `employee_stores`;
CREATE TABLE `employee_stores` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64),
  `store_id` VARCHAR(64),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `employee_stores` (4 rows)
INSERT INTO `employee_stores` (`id`, `employee_id`, `store_id`, `created_at`) VALUES
('77f6f6ed-fbdd-4692-b195-37fc2819148b', 'f38e83d8-d022-4ce6-be67-15d945803795', '35babb6b-cdfb-4c61-840b-38810b5f3948', '2026-07-11T09:08:35.683082+00:00'),
('5b9eca25-7f84-41ea-8712-e8f6ec51dc09', 'f38e83d8-d022-4ce6-be67-15d945803795', 'b11e0746-c49a-43a2-ae39-41f829846213', '2026-07-11T09:08:35.683082+00:00'),
('90405e8a-ee53-4f6e-a43a-0e8b17c049a0', 'f38e83d8-d022-4ce6-be67-15d945803795', '81295227-f235-48d5-9e48-c069efab744b', '2026-07-11T09:08:35.683082+00:00'),
('43f1d0d4-cd8b-403f-96f5-7188e6943159', 'f38e83d8-d022-4ce6-be67-15d945803795', '9704741f-28b3-4752-8d87-b0a89b0c4b40', '2026-07-11T09:08:35.683082+00:00');

-- --------------------------------------------------------
-- Table structure for table `employees`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `username` VARCHAR(255),
  `password` VARCHAR(255),
  `store_id` VARCHAR(64),
  `designation` VARCHAR(255),
  `address` LONGTEXT,
  `postal_code` VARCHAR(255),
  `city` VARCHAR(255),
  `country` VARCHAR(255),
  `contact_no` VARCHAR(255),
  `email` VARCHAR(255),
  `date_of_birth` VARCHAR(255),
  `date_of_join` VARCHAR(255),
  `salary` VARCHAR(255),
  `max_disc` VARCHAR(255),
  `max_special_disc` VARCHAR(255),
  `requisition_approval_limit` VARCHAR(255),
  `is_executive` TINYINT(1) DEFAULT 1,
  `status` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `employees` (4 rows)
INSERT INTO `employees` (`id`, `code`, `name`, `username`, `password`, `store_id`, `designation`, `address`, `postal_code`, `city`, `country`, `contact_no`, `email`, `date_of_birth`, `date_of_join`, `salary`, `max_disc`, `max_special_disc`, `requisition_approval_limit`, `is_executive`, `status`, `created_at`) VALUES
('f38e83d8-d022-4ce6-be67-15d945803795', 'EMP0001', 'Shakil Mahmud', 'shakil', '123456', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'IT Manager', 'Dhaka', '1214', 'Dhaka', 'Bangladesh', '01671408011', '', '1990-12-17', '2017-01-01', NULL, NULL, NULL, NULL, 0, 'ACTIVE', '2026-07-11T07:03:47.738834+00:00'),
('d1249502-b6c9-4299-a5f9-72986fb85c43', 'EMP999999', 'Super Admin', 'msmraqeeb@gmail.com', 'msm039raqeeb', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', '2026-07-11T08:34:09.978267+00:00'),
('be664222-0462-47b0-811c-8f72016600a6', 'SA-4851', 'Super Admin', 'admin@email.com', '123456', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', '2026-07-11T09:16:15.185981+00:00'),
('ac266097-2ad7-449d-996c-826c9ece3c30', 'EMP0002', 'Ashraful', 'ashraful', '123456', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'Sales Executive', 'Dhaka', '1208', 'Dhaka', 'Bangladesh', '0123456789', '', NULL, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', '2026-08-11T04:03:54.765065+00:00');

-- --------------------------------------------------------
-- Table structure for table `held_invoices`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `held_invoices`;
CREATE TABLE `held_invoices` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `hold_no` VARCHAR(255),
  `store_id` VARCHAR(64),
  `terminal_id` VARCHAR(64),
  `customer_id` VARCHAR(64),
  `customer_name` VARCHAR(255),
  `sales_executive_id` VARCHAR(64),
  `subtotal` DECIMAL(15,2) DEFAULT 0.00,
  `net_amount` DECIMAL(15,2) DEFAULT 0.00,
  `invoice_note` LONGTEXT,
  `items_json` LONGTEXT,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `held_invoices` (1 rows)
INSERT INTO `held_invoices` (`id`, `hold_no`, `store_id`, `terminal_id`, `customer_id`, `customer_name`, `sales_executive_id`, `subtotal`, `net_amount`, `invoice_note`, `items_json`, `created_at`) VALUES
('6930af73-4f02-4060-a895-2fedb108540c', 'HOLD-1786441454394', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '3fcf2668-2ac5-485f-aa37-3eeb2f1fb91a', 'Mr.X', 'ac266097-2ad7-449d-996c-826c9ece3c30', 956.75, 957, '', '[{"qty":1,"price":890,"barcode":"1001100004","sBarcode":"1001100004","sd_amount":0,"product_id":"9da46154-3ad7-4a33-9a33-80ddd24c5e25","sd_percent":0,"vat_amount":66.75,"total_value":956.75,"vat_percent":7.5,"product_name":"Baby Shoes (5458)","user_barcode":"1001100004","discount_amount":0,"discount_percent":0,"sales_executive_id":"ac266097-2ad7-449d-996c-826c9ece3c30","sales_executive_name":"Ashraful"}]', '2026-08-11T09:44:14.394+00:00');

-- --------------------------------------------------------
-- Table structure for table `payment_methods`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payment_methods`;
CREATE TABLE `payment_methods` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `bank_name` VARCHAR(255),
  `bank_commission` DECIMAL(15,2) DEFAULT 0.00,
  `bin` VARCHAR(255),
  `status` VARCHAR(255),
  `mfs` TINYINT(1) DEFAULT 1,
  `ec` TINYINT(1) DEFAULT 1,
  `pos` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `payment_methods` (9 rows)
INSERT INTO `payment_methods` (`id`, `code`, `name`, `bank_name`, `bank_commission`, `bin`, `status`, `mfs`, `ec`, `pos`, `created_at`, `updated_at`) VALUES
('0526819d-93f2-4c45-951b-06d10e2975d4', '001', 'bKash', 'bKash', 2.5, '0', 'ACTIVE', 0, 0, 1, '2026-07-11T09:13:23.588644+00:00', '2026-08-11T09:44:47.979+00:00'),
('257b81e0-a3a3-49b0-a651-b64857d056d9', '002', 'City Bank', 'City Bank', 1.65, '0', 'ACTIVE', 0, 0, 1, '2026-07-11T09:13:45.423713+00:00', '2026-08-11T09:45:00.186+00:00'),
('36d85672-9a8c-4a91-b3f1-61595fb9aa5b', '003', 'AMEX', 'City Bank ltd.', 1.65, '0', 'ACTIVE', 0, 0, 1, '2026-08-11T09:53:44.686+00:00', '2026-08-11T09:53:43.873+00:00'),
('f2c0ec3e-385d-4ccf-8417-15a9e098e149', 'CASH', 'Cash', 'Cash', 0, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:15:49.714086+00:00', '2026-08-22T04:15:49.714086+00:00'),
('48f73ece-347a-40ff-9914-15ec0d08c40c', '004', 'BRAC BANK', 'BRAC Bank', 1.5, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:58:32.034247+00:00', '2026-08-22T04:58:32.034247+00:00'),
('6f47f690-2971-4b87-9768-7aa36c323e64', '005', 'City Bank', 'City Bank', 1.5, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:58:32.034247+00:00', '2026-08-22T04:58:32.034247+00:00'),
('5d7c09e9-aeb9-4d1c-8a49-559749425850', '006', 'DBBL', 'Dutch Bangla Bank', 1.5, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:58:32.034247+00:00', '2026-08-22T04:58:32.034247+00:00'),
('4d993404-9d35-4bbd-9ba1-1bfd43ecd0c6', '007', 'NAGAD', 'Nagad MFS', 1.2, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:58:32.034247+00:00', '2026-08-22T04:58:32.034247+00:00'),
('afa280f5-fbd2-46ea-8919-58a3cbc42fae', '008', 'NEXUS PAY', 'DBBL Nexus Pay', 1.5, NULL, 'ACTIVE', 0, 0, 1, '2026-08-22T04:58:32.034247+00:00', '2026-08-22T04:58:32.034247+00:00');

-- --------------------------------------------------------
-- Table structure for table `point_earn_policy`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `point_earn_policy`;
CREATE TABLE `point_earn_policy` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `spend_amount` DECIMAL(15,2) DEFAULT 0.00,
  `redeem_point_value` DECIMAL(15,2) DEFAULT 0.00,
  `min_redeem_point` DECIMAL(15,2) DEFAULT 0.00,
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `point_earn_policy` (1 rows)
INSERT INTO `point_earn_policy` (`id`, `spend_amount`, `redeem_point_value`, `min_redeem_point`, `updated_at`) VALUES
('11e5d1a6-ff93-4ffe-a8a7-8686d013070f', 100, 0, 2000, '2026-06-29T07:42:12.287+00:00');

-- --------------------------------------------------------
-- Table structure for table `pos_user_permissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `pos_user_permissions`;
CREATE TABLE `pos_user_permissions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `store_id` VARCHAR(64),
  `employee_id` VARCHAR(64),
  `permissions` LONGTEXT,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `pos_user_permissions` (1 rows)
INSERT INTO `pos_user_permissions` (`id`, `store_id`, `employee_id`, `permissions`, `created_at`, `updated_at`) VALUES
('ba40145f-1f51-4acf-873a-27b236e63a81', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'f38e83d8-d022-4ce6-be67-15d945803795', '["Stock Search","Invoice Reprint","Software Settings","Global Stock Search","Daily Cash Transaction","Session Close","Day Close Session","Exchange","Stock Receive","Customer Management","Stock Requisition","Stock Transfer","Point of Sale","Void","Cash Return","Customer Edit","Point Redeem","Stock Sync","Cash Flow Entry","Special Discount","Show Cost Price","Manual Data Download","Daily Declaration Posting","Hold Recall","Other Declaration Description","Issue Credit Note","Product Stock Journal","Cancel Invoice","Credit Reconciliation","Payment Type Change","Remove Item","Invoice Discount","Purchase Receive","Purchase Return","Discount Report","Product Expiry","Executive Wise Sale","Terminal Brandwise Sale","Discount Circular","Vendorwise Sale","Pending Sales","Reprint Log","Stock Adjustment Report","Scan Item Update Remove Log","Cash Closing Report","Cash Declaration Report","MVAT Report","Product Delivery Report","Product Receive Report","Invoice Search","Sale Stock Report","Attributewise Stock Report","Stock Report","VAT Report","Brandwise Sale","Itemwise Sale","Invoicewise Sale Customer","Invoicewise Sale Counter","Invoicewise Sale","Reprint","Day Close Report","Inv Adjustment","Inv Report View","Inv Final Post","Inv Scan Barcode","Inv Prepare Season"]', '2026-07-11T07:04:33.849836+00:00', '2026-07-11T07:04:33.849836+00:00');

-- --------------------------------------------------------
-- Table structure for table `price_change_circular_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `price_change_circular_items`;
CREATE TABLE `price_change_circular_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `price_change_circulars`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `price_change_circulars`;
CREATE TABLE `price_change_circulars` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `products`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `barcode` VARCHAR(255),
  `item_name` VARCHAR(255),
  `product_description` LONGTEXT,
  `regional_name` VARCHAR(255),
  `category_id` VARCHAR(64),
  `subcategory_id` VARCHAR(64),
  `sub_subcategory_id` VARCHAR(64),
  `brand_id` VARCHAR(64),
  `country_of_origin` VARCHAR(255),
  `user_define_barcode` VARCHAR(255),
  `vendor_id` VARCHAR(64),
  `is_active` TINYINT(1) DEFAULT 1,
  `disc_exemption` TINYINT(1) DEFAULT 1,
  `member_point_exemption` TINYINT(1) DEFAULT 1,
  `gp_on_mrp` TINYINT(1) DEFAULT 1,
  `gp_on_cost` TINYINT(1) DEFAULT 1,
  `price_including_vat` TINYINT(1) DEFAULT 1,
  `sdc_vat_code` VARCHAR(255),
  `sale_vat_percent` DECIMAL(15,2) DEFAULT 0.00,
  `retailer_service_type` VARCHAR(255),
  `purchase_price` DECIMAL(15,2) DEFAULT 0.00,
  `mrp` DECIMAL(15,2) DEFAULT 0.00,
  `wsp` DECIMAL(15,2) DEFAULT 0.00,
  `profit_on_tp` DECIMAL(15,2) DEFAULT 0.00,
  `profit_on_mrp` DECIMAL(15,2) DEFAULT 0.00,
  `entry_by` VARCHAR(255),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64),
  `wh_stock` DECIMAL(15,2) DEFAULT 0.00,
  `str_stock` DECIMAL(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `products` (240 rows)
INSERT INTO `products` (`id`, `sl`, `code`, `barcode`, `item_name`, `product_description`, `regional_name`, `category_id`, `subcategory_id`, `sub_subcategory_id`, `brand_id`, `country_of_origin`, `user_define_barcode`, `vendor_id`, `is_active`, `disc_exemption`, `member_point_exemption`, `gp_on_mrp`, `gp_on_cost`, `price_including_vat`, `sdc_vat_code`, `sale_vat_percent`, `retailer_service_type`, `purchase_price`, `mrp`, `wsp`, `profit_on_tp`, `profit_on_mrp`, `entry_by`, `status`, `created_at`, `wh_stock`, `str_stock`) VALUES
('340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 1, 'A000001', '1001100001', 'Kids Shoe', 'Pcs', '', '64f1cd61-9e0d-4456-a639-2f1cd048eaca', 'eb861962-ef00-4e50-a6d7-ee8acb9bf441', '394cc31f-ce99-4c4f-89f9-92646a3135f8', 'b4ca6e81-facb-48ab-9468-2d7117d50544', 'China', '1001100001', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 1, 0, 0, 0, 0, 1, '10140445', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 370.5, 591, 0, 59.51, 37.31, 'dbo', 'ACTIVE', '2026-06-24T03:37:40.899818+00:00', 47, 0),
('19d8cc09-6a07-4b84-a6b7-20e450708ab2', 5, 'A000005', '1001100005', 'Boys Shandal (4785)', '', '', '64f1cd61-9e0d-4456-a639-2f1cd048eaca', 'eb861962-ef00-4e50-a6d7-ee8acb9bf441', '394cc31f-ce99-4c4f-89f9-92646a3135f8', 'b4ca6e81-facb-48ab-9468-2d7117d50544', 'Bangladesh', '1001100005', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 1, 0, 0, 0, 0, 1, '10140445', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 490, 990, 0, 102.04, 50.51, 'dbo', 'ACTIVE', '2026-07-13T06:27:32.301239+00:00', -1, 13),
('bd212d7c-abe6-4801-8365-81fcf94559c7', 2, 'A000002', '1001100002', 'Baby Converse (3W486)', '', '', '64f1cd61-9e0d-4456-a639-2f1cd048eaca', '60618841-eb3e-41e7-be96-b21aea6c3f67', '36de7101-7aa0-449d-b950-ab407a1eef77', 'b4ca6e81-facb-48ab-9468-2d7117d50544', 'China', '1001100002', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 1, 0, 0, 0, 0, 1, '', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 410, 742, 0, 80.98, 44.74, 'dbo', 'ACTIVE', '2026-06-24T03:55:20.264887+00:00', 14, 1),
('9da46154-3ad7-4a33-9a33-80ddd24c5e25', 4, 'A000004', '1001100004', 'Baby Shoes (5458)', '', '', '64f1cd61-9e0d-4456-a639-2f1cd048eaca', 'eb861962-ef00-4e50-a6d7-ee8acb9bf441', '394cc31f-ce99-4c4f-89f9-92646a3135f8', 'b4ca6e81-facb-48ab-9468-2d7117d50544', 'Bangladesh', '1001100004', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 1, 0, 0, 0, 0, 1, '10140445', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 450, 890, 0, 97.78, 49.44, 'dbo', 'ACTIVE', '2026-07-13T06:26:42.249704+00:00', 37, 5),
('b4e7310b-22ce-4585-867a-2727da3a0c96', 7, 'A000007', '1001100007', 'Basketball (RI 24588) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '3c7748d0-ccc1-40a6-a78e-cb4b79f2c58a', 'a1871955-a2b0-4bc2-b65d-e509f96f5a1d', 'China', '1001100007', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('195e31ce-4c3e-496f-8634-dcf4ddecac3e', 8, 'A000008', '1001100008', 'Football 15CM (RI 6936088) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '3c7748d0-ccc1-40a6-a78e-cb4b79f2c58a', 'a1871955-a2b0-4bc2-b65d-e509f96f5a1d', 'China', '1001100008', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('9885841b-f9a9-4d6b-82b2-c533bb4b9a5e', 9, 'A000009', '1001100009', 'LE Hot Wheels Basic Car (C4982) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', 'ef9b86fb-fdc0-43be-a5fa-f6a45366cced', 'a1871955-a2b0-4bc2-b65d-e509f96f5a1d', 'China', '1001100009', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('7880bfd9-1128-46dd-b37f-df879d0df265', 3, 'A000003', '1001100003', 'Avent Feeding Bottle 330ml', '', '', '12dbfa92-ebe8-4a61-bdf1-df66b340bb3b', '08368a6e-00c2-4aed-ab25-611239e60acd', '3eda8e39-7d10-4b72-8993-0fd1c8f13c34', 'b1d5cb6e-a97c-4263-b435-227e5998663a', 'UK', '1001100003', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 1, 0, 0, 0, 0, 1, '10140445', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 720, 1129, 0, 56.81, 36.23, 'dbo', 'ACTIVE', '2026-06-28T05:03:39.760902+00:00', 85, 15),
('ec5f3a69-67e4-43a8-a1d9-0f1843143e01', 10, 'A000010', '1001100010', 'Squishy Toy (RI D0152) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', 'ef9b86fb-fdc0-43be-a5fa-f6a45366cced', 'a1871955-a2b0-4bc2-b65d-e509f96f5a1d', 'China', '1001100010', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('c8a1c23b-61f3-4fae-9d6f-2e35451b4023', 11, 'A000011', '1001100011', 'Baby  2 Pcs Rattle Toy (RI JK8821) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', 'ef9b86fb-fdc0-43be-a5fa-f6a45366cced', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100011', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('b0a3eeea-c590-44c7-930f-509bc567fa45', 12, 'A000012', '1001100012', 'LING Baby Playpen (RI YBLI50-180)', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', 'ef9b86fb-fdc0-43be-a5fa-f6a45366cced', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100012', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('8cc387ff-158c-4f34-869d-5a2aace9d15b', 13, 'A000013', '1001100013', 'KC Land Cruiser Big Car (GXR-V8) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '5f17c16d-c5af-4819-b95e-44dfb01f06bb', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100013', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('6496f0ee-f784-4228-90a5-831d89e7cdeb', 6, 'A000006', '1001100006', 'Avent Natural Nipple 0m+', '', '', '12dbfa92-ebe8-4a61-bdf1-df66b340bb3b', 'b4a9a64b-9eb5-4e75-9d27-29a6d1e47bf8', 'bde5035b-2357-4770-a26b-045fa0b2b45c', 'b1d5cb6e-a97c-4263-b435-227e5998663a', 'Bangladesh', '1001100006', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 1, 0, 0, 0, 0, 1, '10140445', 7.5, 'Readymade Graments (Other\'s Brand) : 7.5', 450, 850, 0, 88.89, 47.06, 'dbo', 'ACTIVE', '2026-08-12T04:10:01.786855+00:00', 90, 10),
('555fb63e-f671-48f4-94eb-acdc1c11280c', 14, 'A000014', '1001100014', 'KC BMW Big Car (I8) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '5f17c16d-c5af-4819-b95e-44dfb01f06bb', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100014', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('1b2ad271-352d-4cc4-acbe-08dad678cea6', 15, 'A000015', '1001100015', 'Hancheng Pony Small (RI PS-100) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100015', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('45986d0a-316e-4762-a8b1-1e77a1bf3917', 16, 'A000016', '1001100016', 'Hancheng Pony Big  (RI PB-50) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100016', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 450, 780, 0, 73.33, 42.31, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('cae1ab4b-c1d8-4668-9d3f-32bc0ca70798', 17, 'A000017', '1001100017', 'Chengli Pinball Game (RI TQ-HC5) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100017', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 510, 0, 45.71, 31.37, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('c3d6996a-4aea-4c31-ac22-a333731b5667', 18, 'A000018', '1001100018', 'LE Hot Wheels Basic Car (C4982) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100018', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('52d62e6e-d6e9-4167-ba2e-c6b1be44f65c', 19, 'A000019', '1001100019', 'Dinosaur Car (RI 1810) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100019', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('d3e98304-e5ef-4076-8d69-041e9263893c', 20, 'A000020', '1001100020', 'BAOLI Cartoon Animal Car (RI 2008B) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100020', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('f87b41ef-adee-4319-9863-644bd9e4c01d', 21, 'A000021', '1001100021', 'BAOLI Sliding Car (RI 1221B) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100021', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 890, 0, 154.29, 60.67, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('fbf2877e-3473-4514-b229-c0a9435337c0', 22, 'A000022', '1001100022', 'BAOLI Handbag Microphone (RI 1706) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100022', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('381743c3-8aea-4952-9d46-22df81a3f5aa', 23, 'A000023', '1001100023', 'B.DUCK Inertial Sliding Duck (RI WL-BD074) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100023', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('709dfb7c-9f0d-4190-85d8-f97b9fcbae8d', 24, 'A000024', '1001100024', 'JIAZHU Wild Ecology (RI 301-305) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100024', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('ca0cf412-4b8d-47e1-8a16-808ec73316c9', 25, 'A000025', '1001100025', 'Hola Learning School Bus 18m+ (RI 3126) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100025', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('40967229-1365-4473-99a1-4c14c48a7d42', 26, 'A000026', '1001100026', 'Huile Happy Engineering Vehicle (RI 326AB) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100026', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('4b43e794-e50d-4833-9e52-dfe4a00f3a85', 27, 'A000027', '1001100027', 'AIJ Football (Size-4) (RI 409) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100027', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('88b1cb62-4289-4313-95ba-ed5e79c37c60', 28, 'A000028', '1001100028', 'Hancheng Pony Big  (RI PB-50) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100028', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('c050ebc1-6faf-4f30-83ba-960fab65b795', 29, 'A000029', '1001100029', 'Juesheng Baolong Radio Control Car (RI K-625) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100029', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('35b1bdfc-b4b5-4b76-8d45-89445def5656', 30, 'A000030', '1001100030', 'Juesheng 56 Pcs Block Set (RI HC-038G-22) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100030', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 1050, 2540, 0, 141.9, 58.66, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('869984c3-fc45-4b3e-b0c1-e2080e91296e', 31, 'A000031', '1001100031', 'Juesheng 30 pcs Block Set (RI HC-038G-1) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100031', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('83b4c678-b35a-4081-8a53-58207d7c0887', 32, 'A000032', '1001100032', 'Juesheng Fruit Car (RI 516) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100032', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('a23a5471-deb5-4e21-b82d-b16c30722ac0', 33, 'A000033', '1001100033', 'LIONEL SPORTS PVC Inflatable Ball set (RI D0435) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100033', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('dbd2af62-6b92-4e73-89e6-c51116945d1e', 34, 'A000034', '1001100034', 'LIONEL SPORTS Squishy Toy (RI D0152) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100034', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('3a075519-ce30-4bdf-8eb0-7868db25f3b1', 35, 'A000035', '1001100035', 'METROID Avion Transformable Robot (RI KBL-B14) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100035', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('0d41dd33-4251-49ef-97e2-09640e0f0633', 36, 'A000036', '1001100036', 'METROID Metroplex Robot (RI KBL-B17) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100036', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('591f154e-607e-4449-a769-d7141d1fdf9b', 37, 'A000037', '1001100037', 'Eagle Dancing Cactus (RI MC-1079) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100037', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('dc182676-3bd1-43a4-b919-32d427bc15f1', 38, 'A000038', '1001100038', 'Eagle Dancing Cactus (RI MC-1097) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100038', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('aa2b45f0-4555-45b6-9b8a-e79f7d4dbcf6', 39, 'A000039', '1001100039', 'BAOBEI JIAOSHI Bubble Machine (RI 735-054) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100039', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('bb73c5f8-1a8d-456c-b714-4dd0693c53fb', 40, 'A000040', '1001100040', 'BAOBEI JIAOSHI Bubble Machine (RI 735-056) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100040', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('511d023d-9aee-4485-8e22-fdb9e3721fe6', 41, 'A000041', '1001100041', 'Hola Construction Truck (RI 326) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100041', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('8feace1e-9075-4cd7-960b-086fc1714d1d', 42, 'A000042', '1001100042', 'BAOLI Multi Functional Piano With Chair (37keys) (RI 3037) pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100042', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('062eaa0b-a10a-4ca6-993c-8cbd11e24957', 43, 'A000043', '1001100043', 'INTEX Cutellama Ride On (RI 57564) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100043', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('21bba7c7-6e5e-4665-a584-7f3c4125aae3', 44, 'A000044', '1001100044', 'Eagle Dancing Cactus (RI MC-1097) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100044', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 290, 790, 0, 172.41, 63.29, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('a398cee0-8d04-420e-8cc3-35c86e9bde51', 45, 'A000045', '1001100045', 'HBC Toys Dinosaur World (RI 2020-242) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100045', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('846b3d2b-0140-4408-b781-28105cdc4add', 46, 'A000046', '1001100046', 'HBC Toys Surprise Egg (RI K2858) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100046', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('aecccded-a4d6-4f2c-93c2-2b54a499afd3', 47, 'A000047', '1001100047', 'HBC Toys Cute Doll (RI K2808) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100047', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('1be46d99-cde1-45c3-a673-2bb3f3e1fc32', 48, 'A000048', '1001100048', 'INTEX Deluxe Swimming Vest (RI 58671) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100048', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('96738c44-e8d8-4363-a23f-c6f39d8fd5bc', 49, 'A000049', '1001100049', 'INTEX Deluxe Swimming Vest (RI 58660) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100049', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('edf6399e-06a0-47c8-839b-411e589e0683', 50, 'A000050', '1001100050', 'INTEX Deluxe Arm Brands (RI 58642) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100050', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0);
INSERT INTO `products` (`id`, `sl`, `code`, `barcode`, `item_name`, `product_description`, `regional_name`, `category_id`, `subcategory_id`, `sub_subcategory_id`, `brand_id`, `country_of_origin`, `user_define_barcode`, `vendor_id`, `is_active`, `disc_exemption`, `member_point_exemption`, `gp_on_mrp`, `gp_on_cost`, `price_including_vat`, `sdc_vat_code`, `sale_vat_percent`, `retailer_service_type`, `purchase_price`, `mrp`, `wsp`, `profit_on_tp`, `profit_on_mrp`, `entry_by`, `status`, `created_at`, `wh_stock`, `str_stock`) VALUES
('690ee7ff-fd18-4ac8-9f78-c5539537672b', 51, 'A000051', '1001100051', 'INTEX Jumbo Tubes With Handle (RI 59258) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100051', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('95b8528c-b546-42b3-9f2f-c034d8e896c6', 52, 'A000052', '1001100052', 'INTEX Jumbo Tubes With Handle (RI 59262) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100052', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('80a7afa6-a15a-4c8b-97dd-ee310a3bc9ca', 53, 'A000053', '1001100053', 'INTEX Tropical Buddies Swimming Vest (RI 59661) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100053', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('467e83e9-1fb6-4249-bc87-f4e8df2b9fd3', 54, 'A000054', '1001100054', 'INTEX Swimming Board (RI 59586) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100054', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('ae53b219-61c2-457f-ba14-9b1fcf300ccb', 55, 'A000055', '1001100055', 'INTEX Baby Float (RI 59574) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100055', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('47d92fc8-3aaa-46be-a16a-330ed0fa0c22', 56, 'A000056', '1001100056', 'INTEX Sit Pool Float (RI 59570) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100056', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.538086+00:00', 0, 0),
('886b7e09-e536-47ce-b479-9b7285849693', 57, 'A000057', '1001100057', 'INTEX Swimming Tubes (RI 59242) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100057', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('058bf30b-8134-4a1f-907c-4754ed399ed9', 58, 'A000058', '1001100058', 'BAOLI Handbag Microphone (RI 1706) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100058', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('7f5649ac-663e-448f-afc3-b01b9171d049', 59, 'A000059', '1001100059', 'JIAZHU Dinosaur Figure set (RI 303-205) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100059', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('83ba98b5-9c89-47fb-84dc-aaed3af55560', 60, 'A000060', '1001100060', 'JIAZHU Dinosaur Figure set (RI 303-281) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100060', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('5d1f60c7-c288-4c6f-bd15-0747055657f4', 61, 'A000061', '1001100061', 'Hancheng 03 pcs Prices Doll set (RI 23919) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100061', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('7f1fc276-603d-498e-b9c2-d032cead255c', 62, 'A000062', '1001100062', 'Juesheng Multi-Functional Speaker (RI 262-186) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100062', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('58b99366-5513-4ec8-9b03-5b38c57d7b40', 63, 'A000063', '1001100063', 'Juesheng Fun Story Machine (RI 262-7) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100063', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('16a24ece-4ba2-4212-b6b7-716064fdc90e', 64, 'A000064', '1001100064', 'Juesheng Baolong Radio Control Car (RI K-625) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100064', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('49e3b42e-75fc-4005-ac45-b48a638cbc42', 65, 'A000065', '1001100065', 'Juesheng 56 Pcs Block Set (RI HC-038G-22) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100065', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('9259a6b0-71c9-45f5-9ffd-63c22404005e', 66, 'A000066', '1001100066', 'Juesheng 55 pcs Block Set (RI HC-038G-21) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100066', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('2457635a-df01-498b-9945-ff927234e0d1', 67, 'A000067', '1001100067', 'Juesheng Musical Piano (RI 8551) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100067', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('edd9a359-ec05-4b41-a60a-f2b6c368507c', 68, 'A000068', '1001100068', 'XIAOJIA Baby Headphone set (RI EJ-910) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100068', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('db94f68d-c04e-47d6-86c9-0f8de1fb12e2', 69, 'A000069', '1001100069', 'LIONEL SPORTS PVC Inflatable Ball set (RI D0435) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100069', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('200015c2-2ef5-40eb-a6ae-ce71130e1197', 70, 'A000070', '1001100070', 'METROID Quantum Heroes Dinoster Robot (RI KBL-B9) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100070', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('e4aa0909-f70f-40cb-a030-0ade5c03dcb7', 71, 'A000071', '1001100071', 'Little Tin Lok Little Tin lok Rattle (RI 1073) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100071', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('23e5f52b-43b3-480c-8bd9-c114aaeabb1c', 72, 'A000072', '1001100072', 'LORINDA Baby Tricycle (GREEN) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100072', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b147d3b6-1177-46d9-8252-c9739d0c0073', 73, 'A000073', '1001100073', 'Hola 2 in1 Rocking & Riding Pony (RI 987) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100073', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('2b4e9a78-1974-4e4c-bf5a-a86def432715', 74, 'A000074', '1001100074', 'Hola 3 in1 Rock & Ride Spray Unicorn (RI HE898800) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100074', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('aa7593b6-cccc-4d40-9770-d4d85680521b', 75, 'A000075', '1001100075', 'LORINDA Baby Tricycle (GREEN) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100075', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b216b035-39e7-4f86-bdbf-0d60efa79ad9', 76, 'A000076', '1001100076', 'LORINDA Baby Tricycle (BLUE) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100076', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('cca0fb84-eea1-467f-ba33-21a9e3f3616c', 77, 'A000077', '1001100077', 'RAINBOW Unicorn Rocking Horse (RI BCSL101) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100077', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('60269fa0-bf4a-49d3-a8ea-9edbd8877fee', 78, 'A000078', '1001100078', 'RAINBOW Unicorn Rocking Horse (RI BC8245) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100078', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('cea041c9-7820-47ce-9300-61f3c7fae43f', 79, 'A000079', '1001100079', 'RAINBOW Unicorn Rocking Horse (Rl BCZG-106) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100079', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('61c1fe7d-805c-49ce-a95c-e01ed58ef3a9', 80, 'A000080', '1001100080', 'RAINBOW Unicorn Rocking Horse (RI BCZG-107) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100080', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('ccc34878-1fea-45c4-adad-8798cf6542df', 81, 'A000081', '1001100081', 'Hancheng ECO Builder Block set (RI 176303) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100081', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('a5ed9a5d-0392-4b41-a340-1aea0afa0b60', 82, 'A000082', '1001100082', 'Hancheng Ride On Suitcase (RI SC0022) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100082', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('35f188d5-759c-4687-bd49-7be63da7bacc', 83, 'A000083', '1001100083', 'Donavan Baby Scooter (RI LB1503) 0CBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100083', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('a5d3e66e-7c37-4cbd-a8ba-789a0580df99', 84, 'A000084', '1001100084', 'LORINDA Baby Tricycle (PINK) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100084', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('74a89704-8919-45bd-a0f8-8d0663483dde', 85, 'A000085', '1001100085', 'LORINDA Baby Tricycle (YELLOW) (RI CTL-702) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100085', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b11416ac-0376-43c9-9c63-27c388d96d51', 86, 'A000086', '1001100086', 'LORINDA Baby Tricycle (WHITE) (RI CTL-702) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100086', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('5bfbe3e6-5c6f-46a5-a133-b1a6771ca395', 87, 'A000087', '1001100087', 'YONGHE Inflatable Jumping Animal (102682) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100087', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b1fd0bb4-4e57-45b6-a259-6e1b54ba1c7a', 88, 'A000088', '1001100088', 'Moonlight Fruit Doll (JX-198) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100088', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('44cb7fc3-b7db-4549-b376-739a6cf711e6', 89, 'A000089', '1001100089', 'LORINDA Baby Tricycle (PINK) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100089', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('a3a9ecf0-9c55-41ea-b115-410ae9b13fdb', 90, 'A000090', '1001100090', 'LORINDA Baby Tricycle (GREEN) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100090', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('67f2f1a4-d812-4563-a5ea-d9065882e291', 91, 'A000091', '1001100091', 'LORINDA Baby Tricycle (CHOCOLATE) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100091', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('900a190c-e9d4-4409-bd6f-399b39e85837', 92, 'A000092', '1001100092', 'LORINDA Baby Tricycle (PINK) (RI CTL-702) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100092', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('6637cef6-b9d8-4758-b20c-9735f805ea1d', 93, 'A000093', '1001100093', 'LIONEL SPORTS Jumping Animal (DOG) (RI D0206) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100093', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('f318acc4-4cf6-472d-bcab-9cf7ed185f29', 94, 'A000094', '1001100094', 'LORINDA Baby Bicycle 20 (PINK) (RI XX4-20) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100094', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('acef1659-af92-4786-b941-851c12d3b334', 95, 'A000095', '1001100095', 'LORINDA Baby Bicycle 12 (ORENGE YELLOW) (RI XX9-12) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100095', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('91e1106f-413d-484b-9c1c-0e6c161c914d', 96, 'A000096', '1001100096', 'LORINDA Baby Tricycle (BLUE) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100096', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('a9664917-e4b5-4c66-8b9f-e4adc32161d5', 97, 'A000097', '1001100097', 'RAINBOW Unicorn Rocking Horse (Rl BCZG-108) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100097', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('73a30ce3-2981-4f9d-ab61-2599b04cac25', 98, 'A000098', '1001100098', 'Donavan Baby Scooter (RI LB1503) 0CBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100098', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b033511c-6e79-417c-9923-2e230169c72f', 99, 'A000099', '1001100099', 'LORINDA Baby Tricycle (PINK) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100099', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('27fd7f0b-b6ae-4669-ab68-490db8f2aed2', 100, 'A000100', '1001100100', 'LORINDA Baby Tricycle (PINK) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100100', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0);
INSERT INTO `products` (`id`, `sl`, `code`, `barcode`, `item_name`, `product_description`, `regional_name`, `category_id`, `subcategory_id`, `sub_subcategory_id`, `brand_id`, `country_of_origin`, `user_define_barcode`, `vendor_id`, `is_active`, `disc_exemption`, `member_point_exemption`, `gp_on_mrp`, `gp_on_cost`, `price_including_vat`, `sdc_vat_code`, `sale_vat_percent`, `retailer_service_type`, `purchase_price`, `mrp`, `wsp`, `profit_on_tp`, `profit_on_mrp`, `entry_by`, `status`, `created_at`, `wh_stock`, `str_stock`) VALUES
('e2f648e3-87c5-4293-8229-49aedc298051', 101, 'A000101', '1001100101', 'LORINDA Baby Tricycle (GREEN) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100101', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('8049378a-d89e-4f7e-8f1a-7aac8edf470b', 102, 'A000102', '1001100102', 'LORINDA Baby Tricycle (CHOCOLATE) (RI CTL-700) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100102', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('791c1522-8915-4344-8c61-b0dcf1b2e6e2', 103, 'A000103', '1001100103', 'Wenzhou Foldable Slide with Ball Frame (YELLOW) (RI UN-CT04) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100103', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('9b353ca0-b7b2-491b-bb75-e5e11645858d', 104, 'A000104', '1001100104', 'Wenzhou Foldable Slide with Ball Frame (GREEN) (RI UN-CT04) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100104', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('93a38e16-3395-4bbf-8d0c-8494da6713e8', 105, 'A000105', '1001100105', 'Wenzhou Shark slide Ball Frame (BLUE) (RI UN-DW73) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100105', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('b08996e6-8bab-453d-885e-7eb87cd41e33', 106, 'A000106', '1001100106', 'Wenzhou Slide Swing with Ball Frame (COLORFUL) (RI UN-DW07) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100106', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:21.848225+00:00', 0, 0),
('609c2768-b3f8-4251-945e-e32733f0979f', 107, 'A000107', '1001100107', 'Wenzhou 3 in 1 Slide Swing Telescope (PINK) (RI UN-JT14) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100107', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('2e1fec6f-81ed-4d01-bc36-449993c0a62a', 108, 'A000108', '1001100108', 'LORINDA Baby Bicycle 14 (BLUE) (RI XX2-14) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100108', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('89e73c85-aa6e-4dd7-83e8-ca2891c5ef43', 109, 'A000109', '1001100109', 'LORINDA Baby Bicycle 12 (ORENGE YELLOW) (RI XX9-12) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100109', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('b7ee0efb-3ccb-4f2b-b4fb-1ea9b10de57f', 110, 'A000110', '1001100110', 'Juesheng Water Gun (RI 222-61C) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100110', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('bece78da-9732-4151-808e-36559ebbb24f', 111, 'A000111', '1001100111', 'BABY KING Rattle Rings (RI SB9122) LM', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100111', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('a4eee547-79f6-4aee-8387-03f52a24a8dd', 112, 'A000112', '1001100112', 'B.DUCK Water Gun (RI WL-BD426) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100112', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('5beb5c44-f558-44bb-8802-e2bfcf4c182b', 113, 'A000113', '1001100113', 'B.DUCK Water Gun Duck (RI WL-BD427) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100113', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('965c90f0-30dd-474e-bfa1-fc6c603c0203', 114, 'A000114', '1001100114', 'B.DUCK Sand Hammer (RI WL-BD003) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100114', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('6a09d662-1184-41ec-930f-1ad95cf53a87', 115, 'A000115', '1001100115', 'JIAZHU Animal World (RI 303-255) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100115', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('da575bbd-9e3c-4aa9-9255-ff42e704e19f', 116, 'A000116', '1001100116', 'MARACAS Kids Musical Instrument Toy  (RI 999A-1) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100116', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('53ee2988-3fea-46ac-a2ab-9186f2437002', 117, 'A000117', '1001100117', 'Hancheng 8 pcs Dino Egg (RI 7438) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100117', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('5ecab300-2a61-4c6b-8f9b-f8326693803e', 118, 'A000118', '1001100118', 'Hancheng 03 pcs Dino  Egg (RI 7437) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100118', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('cff1be45-b96d-49fd-b41f-dc6802df4f01', 119, 'A000119', '1001100119', 'LABUBU Anti Stress Squishy (RI 852238) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100119', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('f5b8ccaf-cd8a-4ab6-ac2e-b8789cd449a9', 120, 'A000120', '1001100120', 'LABUBU Key Ring Doll (RI LKD-120) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100120', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('a10cc52d-6f3c-471a-91ca-bc51397aa77e', 121, 'A000121', '1001100121', 'LABUBU Key Ring Doll (RI LKD-60) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100121', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('64e3f718-efd9-42fb-b039-ad1b90ce4d89', 122, 'A000122', '1001100122', 'LABUBU Doll Key Ring (RI DKR-24) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100122', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('8b765868-0760-498d-944d-00f97723e34f', 123, 'A000123', '1001100123', 'LABUBU Collection Badge (RI 678902) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100123', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('ebce10b2-1d75-44d8-a33b-8e71d08f07d7', 124, 'A000124', '1001100124', 'Juesheng Football (RI 8448) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100124', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('c08ae55a-74a8-4144-9924-e1b096168359', 125, 'A000125', '1001100125', 'Juesheng Football (RI 8422) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100125', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('7d59be8b-194e-4154-b6dd-973b318d9c31', 126, 'A000126', '1001100126', 'Juesheng Water Gun (RI 222-61C) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100126', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('71ba205a-6f86-4090-9810-7cc8d7d02ffe', 127, 'A000127', '1001100127', 'Juesheng Water Gun (RI 222-31M) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100127', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('429688a6-5724-41ce-acd9-84e07f0ecc49', 128, 'A000128', '1001100128', 'LIONEL SPORTS Ball Bucket (RI BB-34) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100128', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('5df46bf2-c584-44dc-bd3d-8213c9745029', 129, 'A000129', '1001100129', 'LIONEL SPORTS PVC Ball (RI D0169) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100129', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('ecf15f8a-e9bd-4661-ba35-f5e1abab490b', 130, 'A000130', '1001100130', 'LIONEL SPORTS 5 inch Football (RI 720473) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100130', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('c9ce66d1-06ba-4dae-9693-c4ad0261672f', 131, 'A000131', '1001100131', 'LIONEL SPORTS Training Football (RI D0404) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100131', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('9ffdcd10-b5d7-4377-9ad6-ea3c2e9e725f', 132, 'A000132', '1001100132', 'LIONEL SPORTS 6 inch Basketball (RI D0381) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100132', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('482ee11a-70ae-426c-b52d-0fdbf01a6dae', 133, 'A000133', '1001100133', 'LIONEL SPORTS 6 inch Football (RI 720572) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100133', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('96696f01-4371-4dfd-8f41-c0bc9af7ef1f', 134, 'A000134', '1001100134', 'Dong Rong Soft Bullet Gun (RI 2023-2) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100134', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('b6ae2b2d-f4f4-47e2-bdfe-54245b60e7ba', 135, 'A000135', '1001100135', 'Eagle Trampoline (RI YT0108) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100135', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('26ba686d-589c-48c1-abab-8458a2b4cf21', 136, 'A000136', '1001100136', 'Dong Rong Multi Functional Kitchen Set Pink (RI MJL-88) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100136', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('f7f9a471-c813-4051-8818-72d95d458fc5', 137, 'A000137', '1001100137', 'Dong Rong 2 in 1 Play Kitchen 64 pcs Set (RI 678-1A) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100137', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('b4549f1b-4fe6-435c-9d06-8792dc0ce26c', 138, 'A000138', '1001100138', 'Dong Rong Kitchen Sink Set (RI 2212) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100138', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('3a419a20-0072-44da-bba7-1c8a5e4651f4', 139, 'A000139', '1001100139', 'China Brand Inflable Bouncer (IB6524) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100139', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('33874ec7-b9f8-4ecb-a085-f733fa4c12a5', 140, 'A000140', '1001100140', 'JE Rattle Toy Set (M-06)', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100140', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('da083d94-14c3-4db5-a305-120e7d339839', 141, 'A000141', '1001100141', 'AIJ Football (Size-2) (RI 972673) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100141', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('bcb59e2a-7ce1-4f51-a78f-81cff4ea9097', 142, 'A000142', '1001100142', 'AIJ Football (Size-4) (RI 409) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100142', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('d2965729-d2d2-4fb8-bfc8-b56287884c00', 143, 'A000143', '1001100143', 'YONGHE Inflatable Jumping Animal (102682) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100143', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('113e3f1b-dff0-4a57-8b20-c076b17f00d8', 144, 'A000144', '1001100144', 'Juesheng Football (RI 8448) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100144', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('d27c47b6-91dd-4d6e-a806-24bdad11fbfb', 145, 'A000145', '1001100145', 'Juesheng Football (RI 8422) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100145', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('c736ce84-c922-4a54-a8f7-7def7fecbd3e', 146, 'A000146', '1001100146', 'LIONEL SPORTS Jumping Animal (HORSE) (RI D0510) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100146', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('3370f3d6-e414-415f-a68a-e163c8f8d4c4', 147, 'A000147', '1001100147', 'LIONEL SPORTS Jumping Animal (DEER) (RI D0176) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100147', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('aa1da833-cc39-4c64-9dd6-9e956a7560ca', 148, 'A000148', '1001100148', 'LIONEL SPORTS PVC Ball (RI D0169) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100148', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('7d341356-fac7-4f2f-8af4-1b7dceeb231a', 149, 'A000149', '1001100149', 'LIONEL SPORTS 5 inch Football (RI 720473) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100149', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('0414a5dd-a64c-4b42-ad57-9b7b281645c0', 150, 'A000150', '1001100150', 'LIONEL SPORTS Training Football (RI D0404) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100150', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0);
INSERT INTO `products` (`id`, `sl`, `code`, `barcode`, `item_name`, `product_description`, `regional_name`, `category_id`, `subcategory_id`, `sub_subcategory_id`, `brand_id`, `country_of_origin`, `user_define_barcode`, `vendor_id`, `is_active`, `disc_exemption`, `member_point_exemption`, `gp_on_mrp`, `gp_on_cost`, `price_including_vat`, `sdc_vat_code`, `sale_vat_percent`, `retailer_service_type`, `purchase_price`, `mrp`, `wsp`, `profit_on_tp`, `profit_on_mrp`, `entry_by`, `status`, `created_at`, `wh_stock`, `str_stock`) VALUES
('375b4079-c373-487e-bd4d-170df7d47047', 151, 'A000151', '1001100151', 'LIONEL SPORTS 6 inch Basketball (RI D0381) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100151', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('36e83db3-5860-4e45-823d-e0be8b85fae9', 152, 'A000152', '1001100152', 'LIONEL SPORTS 6 inch Football (RI 720572) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100152', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('a0aed6e5-d765-4ed8-9f29-4b15d807ee29', 153, 'A000153', '1001100153', 'JACKY BABY Wonder Wheel (RI 80160) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100153', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('3c901d1d-7659-43f6-a1dd-4271458d445b', 154, 'A000154', '1001100154', 'LIONEL SPORTS Ball Bucket (RI BB-34) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100154', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('437e4ef0-ab39-4930-900e-545a4fd7b12a', 155, 'A000155', '1001100155', 'HEBEI Push CarPink(SRM-007) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100155', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('c28ee015-e65a-41b3-87ec-e590be9ab37a', 156, 'A000156', '1001100156', 'RI HebieBoyi Push Car (Orange) (SRM-007) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100156', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.140126+00:00', 0, 0),
('4ae24e6d-acbd-48ca-b42f-12ab95a8ea5f', 157, 'A000157', '1001100157', 'BAOLI Multi Functional Piano With Chair (37keys) (RI 3037) pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100157', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('6f99c575-ceaa-4bac-ac31-684c3632851b', 158, 'A000158', '1001100158', 'BAOLI Dreaming Party Crane (RI 1804B) pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100158', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('fc6fc0bd-1b04-40be-95e3-66339dc27f40', 159, 'A000159', '1001100159', 'LORINDA Baby Tricycle (BLUE) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100159', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('b276372d-8dcb-4aa8-a2a0-484a8ad219ee', 160, 'A000160', '1001100160', 'LORINDA Baby Tricycle (PINK) (RI CTL-701) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100160', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('f423d45c-ffc2-463c-abea-b74d6ec8ee75', 161, 'A000161', '1001100161', 'LORINDA Baby Tricycle (RED) (RI CTL-702) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100161', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('64600dc2-adff-4d62-b8d5-d207fd50fcdf', 162, 'A000162', '1001100162', 'BAOLI B/O Party Saxophone (RI 1801) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100162', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('c20f4e69-a679-46e3-bb18-ccfb87ba8803', 163, 'A000163', '1001100163', 'BABOLY Fashion Doll (30CM) (RI 8862) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100163', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('ba04d04b-f3f2-4143-8337-6ecea3d201d7', 164, 'A000164', '1001100164', 'CP Baby Popit Game (RI PG-201)', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100164', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('7adc2f9c-391f-41c9-904b-10123448dc5d', 165, 'A000165', '1001100165', 'FEIFAN Animal Union (RI 889-3) `Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100165', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('df6efac1-67d5-4491-9ae4-9a1fea793ba7', 166, 'A000166', '1001100166', 'JACKY BABY Baby Pop It Game (RI PG-500) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100166', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('fff3e511-bc8a-4a71-b077-2902e0dbb6f3', 167, 'A000167', '1001100167', 'Dong Rong Kitchen Sink Set (RI 2212) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100167', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('3271fdad-c694-420a-9e87-ea6015a25a54', 168, 'A000168', '1001100168', 'Dong Rong Diy Puzzle Block 140pcs (RI MG1131) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100168', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('8675c55d-b930-4d30-b85a-8dbff8af37e3', 169, 'A000169', '1001100169', 'ZKB Supper Alloy Ares Block (RI 1412) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100169', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('c06194f5-cdc1-4b1e-900b-8249a6108935', 170, 'A000170', '1001100170', 'MARACAS Kids Musical Instrument Toy  (RI 999A-1) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100170', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('b5c824b0-7302-4d04-ad0d-98f2a5f1dcb2', 171, 'A000171', '1001100171', 'Huile Whistle & Bath Bubble Toy 36m+ (RI 529) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100171', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('3630b806-f753-4872-8eda-94c935b46d49', 172, 'A000172', '1001100172', 'Sun Lin 2-in-1 Musical Jam Playmat  (RI SLW9382) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100172', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('fe2f7bb0-ca62-499d-a5ef-54ad252fc264', 173, 'A000173', '1001100173', 'Hancheng Dino Egg (RI 7436) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100173', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('f11d78a2-bb35-4391-9520-10469ccf2a7c', 174, 'A000174', '1001100174', 'Hancheng Bath Squirters (RI DHJ88) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100174', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('9e0e9607-cfd3-4dbd-8a05-5cf454654113', 175, 'A000175', '1001100175', 'Hancheng Rattle Ring Teether (RI CTD90) 0ABE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100175', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('8528d212-7439-4294-84b0-f6752ebc2df5', 176, 'A000176', '1001100176', 'Golden Rich Multi Storey Car Park (RI 1516) (0EBE) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100176', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('96fb3fd1-f4a3-48e5-8793-2e7740f3ec48', 177, 'A000177', '1001100177', 'Golden Rich Poke Del-Z (RI 205020) (0EBE) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100177', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('076b3f3e-bae7-4bd6-85b8-711f8d42260d', 178, 'A000178', '1001100178', 'Juesheng Play House (RI 2570P) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100178', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('7e85f759-2ec1-4835-a6c5-347c63ffb44f', 179, 'A000179', '1001100179', 'Juesheng Beauty Box (RI XLX-1058) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100179', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('db9b60ec-9be2-405a-94b2-72c523161f52', 180, 'A000180', '1001100180', 'Juesheng Princess Barbie Doll Set (RI 598-218) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100180', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('e48c018c-75c9-4760-b707-72d4ac46fb52', 181, 'A000181', '1001100181', 'Juesheng Education Toys (RI 262-183) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100181', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('b8efb875-da80-4c18-bba4-341918df40ce', 182, 'A000182', '1001100182', 'Juesheng Multi-Functional Speaker (RI 262-186) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100182', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('5d8b2c9b-b681-4586-9ff5-78c17f1cf0ab', 183, 'A000183', '1001100183', 'Juesheng 25 pcs Block Set (RI HC-038G-2) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100183', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('691eb8c5-68d3-4f50-b26d-45a87f5213de', 184, 'A000184', '1001100184', 'Juesheng Musical Piano (RI 8551) 0IBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100184', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('6e6140d6-61d6-448c-9dc7-26c58f6831a6', 185, 'A000185', '1001100185', 'Candy Toy 4 Pcs Five Star Toy (RI FS-37814) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100185', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('76970a6d-0a4d-47c9-884d-a84c7f06453c', 186, 'A000186', '1001100186', 'Candy Toy Musical Dancing Dog (RI MG-002) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100186', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('e8da23ac-0ec9-4f29-af3a-c49deadb002c', 187, 'A000187', '1001100187', 'Candy Toy Parking Lot (RI 037-C8) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100187', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('64abe0ec-d3f4-49a4-b8ca-e56922072b24', 188, 'A000188', '1001100188', 'ZHENGXING Ultra Light Clay (RI 8835) 0JBE Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100188', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('b2763264-9a08-40e6-89f5-5e00d9a32f13', 189, 'A000189', '1001100189', 'Eagle Dancing Cactus (RI MC-1079) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100189', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('81e64e3a-81ff-4f67-9d8e-25ca8487b20e', 190, 'A000190', '1001100190', 'Eagle Dancing Cactus (RI MC-1097) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100190', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('93f4ed09-4f1a-4840-acda-b14438a30116', 191, 'A000191', '1001100191', 'Hola Early Learning Loco (RI HE9981) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100191', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('cb223fe1-e5fd-477c-a5f9-41966023647a', 192, 'A000192', '1001100192', 'Hola 2 in 1 Musical Elephant (RI 3135) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100192', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('8a209db1-e1b6-4eca-9854-08fd0022c4c8', 193, 'A000193', '1001100193', 'Hola Musical Cot Mobile with Bird Toys (RI E995) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100193', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('362514af-8a9a-4a71-8230-1a768666bab7', 194, 'A000194', '1001100194', 'Hola Construction Truck (RI 326) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100194', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('10ba681a-8367-447b-b8ef-1f28e59e805d', 195, 'A000195', '1001100195', 'Juesheng Rattle Toys (RI 9896) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100195', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('799a429c-a80e-4786-aeb6-281b45fa9395', 196, 'A000196', '1001100196', 'Little Tin Lok Little Tin lok Rattle (RI 1073) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100196', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('4369314a-120a-4fa1-9c24-b8ce5d08d95e', 197, 'A000197', '1001100197', 'LORINDA Baby Bicycle 20 (BLUE) (RI XX10-20) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100197', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('4cf3ac1f-7522-4360-9f4b-f4c812359aee', 198, 'A000198', '1001100198', 'LORINDA Baby Bicycle 12 (GREEN) (RI XX6-12) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100198', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('7b8502e8-616f-4d29-82fd-696e83308437', 199, 'A000199', '1001100199', 'Nerf Gun Orange Nerf Gun (RI 60202) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100199', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('07db0d97-c53c-4586-8627-8248c9bd023a', 200, 'A000200', '1001100200', 'Sun Lin Animals Party Playmat  (RI SLW936) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100200', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0);
INSERT INTO `products` (`id`, `sl`, `code`, `barcode`, `item_name`, `product_description`, `regional_name`, `category_id`, `subcategory_id`, `sub_subcategory_id`, `brand_id`, `country_of_origin`, `user_define_barcode`, `vendor_id`, `is_active`, `disc_exemption`, `member_point_exemption`, `gp_on_mrp`, `gp_on_cost`, `price_including_vat`, `sdc_vat_code`, `sale_vat_percent`, `retailer_service_type`, `purchase_price`, `mrp`, `wsp`, `profit_on_tp`, `profit_on_mrp`, `entry_by`, `status`, `created_at`, `wh_stock`, `str_stock`) VALUES
('d35d704b-4143-4206-91c2-ab265ac823a0', 201, 'A000201', '1001100201', 'Candy Toy Musical Dancing Dog (RI MG-002) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100201', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('7c8bb371-3cfa-461f-9ccd-f51a9ca8ef2a', 202, 'A000202', '1001100202', 'RE Nerf Triad Ex (80065) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100202', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('2151a99b-6dee-4130-be6f-faf2de418027', 203, 'A000203', '1001100203', 'RE Nerf Tri Break (60136) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100203', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('ddbeff59-2f13-4ba7-b8d1-b9b37cc3c911', 204, 'A000204', '1001100204', 'SI Brove Robot (M-01) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100204', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('b82ba495-cac3-44ff-89c4-71cefadf0792', 205, 'A000205', '1001100205', 'SI Robot (M-03) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100205', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('c8145b9f-7e17-4127-a07a-0fe39e893dd2', 206, 'A000206', '1001100206', 'SI YoYo Toy (M-04) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100206', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.43859+00:00', 0, 0),
('e7ac9342-08b2-47e5-8484-2aaf1e9be7ae', 207, 'A000207', '1001100207', 'SI Makeup Box (M-11) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100207', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('2f598807-6e89-49b9-9f10-32ba153d8aa6', 208, 'A000208', '1001100208', 'SI Musical Gum (M-13) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100208', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('9f31aafc-8642-467b-944e-2a8d16d60528', 209, 'A000209', '1001100209', 'SI Rattle Toy (M-14) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100209', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('8a25251b-a138-4448-b642-ece297393f2c', 210, 'A000210', '1001100210', 'SI Jumping Chicken (M-16) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100210', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('69819801-8bd7-49e0-b02d-ec10d8bcaa8b', 211, 'A000211', '1001100211', 'SI 2 In 1 Gun (M-19) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100211', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('0fc8a9d4-2192-4477-a075-0360e1852a21', 212, 'A000212', '1001100212', 'SI Dancing Bee (M-06) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100212', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('2804f5c0-85fc-48e9-b7b5-a9421b6d77e2', 213, 'A000213', '1001100213', 'SI Dinosaur (M-03) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100213', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('46bd7e7b-c856-4a7c-96f4-c4ea8ac87af6', 214, 'A000214', '1001100214', 'SI Steering Wheel Board Game (M-10) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100214', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('99d6e767-35c4-4426-bcb2-53e9565333ea', 215, 'A000215', '1001100215', 'Eagle Trampoline (RI YT0111) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100215', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('3075f553-8133-4c1f-85b8-8cc879753684', 216, 'A000216', '1001100216', 'PINK FRIEND Shopping Cart Refrigerator set (RI YY37056) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100216', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('469b0763-05df-4da3-824b-e983ead0f084', 217, 'A000217', '1001100217', 'PINK FRIEND Edge Refrigerator set (RI YY37054) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100217', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('dcf93a9a-0217-48f4-9c2b-058afc6bd801', 218, 'A000218', '1001100218', 'PINK FRIEND Fun Mushroom House (RI YY37916) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100218', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('711bd585-42e5-4464-9226-f66aec1bbe7e', 219, 'A000219', '1001100219', 'PINK FRIEND Pet Hotel Room (RI YY37029) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100219', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('3a1368dd-0841-4fc5-b2ae-9fd30e3e82b9', 220, 'A000220', '1001100220', 'PINK FRIEND Dream Dressing Box (RI YY57031) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100220', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('a5dc9511-bcb1-4aaf-a28b-d70a50bfddb4', 221, 'A000221', '1001100221', 'PINK FRIEND My Playhouse (RI YY37901) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100221', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('43d31f96-9db3-4367-ac79-4efbaf845013', 222, 'A000222', '1001100222', 'PINK FRIEND Happy House (RI YY57024) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100222', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('6a096cd7-ab01-4edd-a10c-6f4aeb87ab55', 223, 'A000223', '1001100223', 'PINK FRIEND Play Manual Blender (RI YY37009) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100223', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('d660b8c2-5211-4e9d-b1b1-94365b5de534', 224, 'A000224', '1001100224', 'PINK FRIEND Delicious Fast Food Truck (RI YY37904) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100224', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('33bd0c67-5368-4486-91cc-6937d107e04c', 225, 'A000225', '1001100225', 'PINK FRIEND Coffee Playset (RI YY17146) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100225', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('155c8782-a447-4a51-b2f4-6e9fad00c7a0', 226, 'A000226', '1001100226', 'PINK FRIEND Fun Cooking set (RI YY37024) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100226', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('43b871f0-459c-47f8-8e65-3fb70abfd479', 227, 'A000227', '1001100227', 'Erica Finger Spinner Ball (RI 999) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', 'fa210645-baa9-4b75-adbd-2a0884db635f', 'China', '1001100227', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('c09c9254-73ea-46ab-be21-059883f51306', 228, 'A000228', '1001100228', 'JACKY BABY Musical Rattle Toy (RI BRF50) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100228', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('a2cf58a6-e61e-4472-aa36-189fae5e0524', 229, 'A000229', '1001100229', 'JACKY BABY Baby Rattle Toy (RI 019052) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100229', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('76271c5b-3231-4031-9465-8d69f0584628', 230, 'A000230', '1001100230', 'JACKY BABY Baby Rattle Toy (RI 419140) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100230', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('99c72cac-2278-49d5-96d2-bc60a52e54d6', 231, 'A000231', '1001100231', 'JACKY BABY Hanging Rattle Toy (RI HR-20) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100231', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('4f0c99c7-bf0b-4d63-9cd1-830092219d19', 232, 'A000232', '1001100232', 'JACKY BABY Octopus Hanging Toy (RI PO-20) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100232', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('2bfc51cb-faed-4802-9868-7826452093e3', 233, 'A000233', '1001100233', 'JACKY BABY Rattle and Teether Toys (RI 541) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100233', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('1d364902-6439-4a00-b2ed-160b304a7b10', 234, 'A000234', '1001100234', 'JACKY BABY Robot Car (RI 168-6) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100234', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('e08f0538-fba4-4e68-9a31-effd71148871', 235, 'A000235', '1001100235', 'JACKY BABY Robot Plane (RI 168-8) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100235', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('c99450cd-ac47-414c-a256-1ce9241711b9', 236, 'A000236', '1001100236', 'JIAZHU Animal Figer (RI 303-281&303-255) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100236', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('f1481650-acb6-4dc9-9e4e-710bebd540e8', 237, 'A000237', '1001100237', 'JIAZHU Dinosaur Figure (RI 303-205)', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100237', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('51dfb584-637d-4447-aaa9-e279fc7bed0b', 238, 'A000238', '1001100238', 'KE Football (F-50) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100238', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('39d88b76-bbbb-4cd5-88e1-e662bd77ee88', 239, 'A000239', '1001100239', 'MG Kids Ocean 200 Pcs Balls (WQA002-200A) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100239', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0),
('6ebc6a8d-4b47-4e7c-93ab-ef45ee3c2b03', 240, 'A000240', '1001100240', 'MG Baby Playpen (603999) Pcs', 'Pcs', '', 'f6180931-abb9-4781-ab6a-8314d2ce1a49', 'd84543ae-2f1e-43f7-953c-5b6e7ad7859c', '6cd45708-c641-4b84-857c-68440652ad77', '0abed4ce-6778-41fc-a2e7-5527d31ac6e2', 'China', '1001100240', '046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 1, 0, 0, 0, 0, 1, '10140445', 0.075, 'Readymade Graments (Other\'s Brand) : 7.5', 350, 590, 0, 68.57, 40.68, 'dbo', 'ACTIVE', '2026-08-25T04:15:22.724235+00:00', 0, 0);

-- --------------------------------------------------------
-- Table structure for table `promotion_customer_tags`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `promotion_customer_tags`;
CREATE TABLE `promotion_customer_tags` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `promotion_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `promotion_items`;
CREATE TABLE `promotion_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `promotion_id` VARCHAR(64),
  `brand` VARCHAR(255),
  `category` VARCHAR(255),
  `sub_category` VARCHAR(255),
  `sub_subcategory` VARCHAR(255),
  `vendor` VARCHAR(255),
  `item` VARCHAR(255),
  `barcode` VARCHAR(255),
  `user_barcode` VARCHAR(255),
  `description` LONGTEXT,
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `vendor_contribution_percent` DECIMAL(15,2) DEFAULT 0.00,
  `vendor_contribution_amount` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `promotion_items` (3 rows)
INSERT INTO `promotion_items` (`id`, `promotion_id`, `brand`, `category`, `sub_category`, `sub_subcategory`, `vendor`, `item`, `barcode`, `user_barcode`, `description`, `discount_percent`, `discount_amount`, `vendor_contribution_percent`, `vendor_contribution_amount`, `created_at`) VALUES
('7a24d0eb-e48c-4b3d-9750-35b082d93cc8', 'ee884085-1fe0-4fb1-a4ba-3f15b890b27b', '', '', '', '', '', '', '1001100002', '1001100002', 'Baby Converse (3W486)', 2, 0, 0, 0, '2026-06-28T09:07:19.973514+00:00'),
('78fc81af-bcad-4fde-bf40-1c61d0d1ae98', '8571c668-7e29-40e3-8a48-fc76ebcf29b8', 'Buy', NULL, NULL, NULL, NULL, '2', '1001100002', NULL, 'Baby Converse (3W486)', 0, 742, 0, 0, '2026-06-28T09:08:35.927033+00:00'),
('99724347-ca6f-47b7-a1ed-36743fba2233', '8571c668-7e29-40e3-8a48-fc76ebcf29b8', 'Get', NULL, NULL, NULL, NULL, '1', '1001100003', NULL, 'Avent Feeding Bottle 330ml', 0, 1129, 0, 0, '2026-06-28T09:08:35.927033+00:00');

-- --------------------------------------------------------
-- Table structure for table `promotions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `circular_code` VARCHAR(255),
  `circular_name` VARCHAR(255),
  `promotion_type` VARCHAR(255),
  `valid_from` VARCHAR(255),
  `valid_to` VARCHAR(255),
  `point_enable` TINYINT(1) DEFAULT 1,
  `stores` VARCHAR(255),
  `created_at` VARCHAR(64),
  `buy_item_count` VARCHAR(255),
  `get_item_count` VARCHAR(255),
  `coupon_no` VARCHAR(255),
  `coupon_type` VARCHAR(255),
  `coupon_disc_val` DECIMAL(15,2) DEFAULT 0.00,
  `coupon_max_disc_amt` DECIMAL(15,2) DEFAULT 0.00,
  `coupon_redeem_limit` DECIMAL(15,2) DEFAULT 0.00,
  `coupon_min_purchase` DECIMAL(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `promotions` (3 rows)
INSERT INTO `promotions` (`id`, `circular_code`, `circular_name`, `promotion_type`, `valid_from`, `valid_to`, `point_enable`, `stores`, `created_at`, `buy_item_count`, `get_item_count`, `coupon_no`, `coupon_type`, `coupon_disc_val`, `coupon_max_disc_amt`, `coupon_redeem_limit`, `coupon_min_purchase`) VALUES
('ee884085-1fe0-4fb1-a4ba-3f15b890b27b', 'PR20260628413', 'Stock Clearance', 'Circular Discount', '2026-06-28T00:00:00+00:00', '2026-07-11T00:00:00+00:00', 0, 'Central Store, Shop', '2026-06-28T09:07:19.678576+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('8571c668-7e29-40e3-8a48-fc76ebcf29b8', 'PR20260628715', 'Stock Clearance', 'Buy Get', '2026-06-28T00:00:00+00:00', '2026-07-11T00:00:00+00:00', 0, 'Central Store, Shop', '2026-06-28T09:08:35.631443+00:00', '*2', '*1', NULL, NULL, NULL, NULL, NULL, NULL),
('b38a81c9-feb5-431e-a979-ac3a62ca3346', 'PR20260628546', 'First Order', 'Coupon', '2026-06-28T00:00:00+00:00', '2026-07-31T00:00:00+00:00', 0, 'Central Store, Shop', '2026-06-28T09:17:33.465598+00:00', NULL, NULL, '49321', 'Percent', 5, 0, 1, 1500);

-- --------------------------------------------------------
-- Table structure for table `promotion_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `promotion_items`;
CREATE TABLE `promotion_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `promotion_id` VARCHAR(64) NOT NULL,
  `brand` VARCHAR(255),
  `category` VARCHAR(255),
  `sub_category` VARCHAR(255),
  `sub_subcategory` VARCHAR(255),
  `vendor` VARCHAR(255),
  `item` VARCHAR(255),
  `barcode` VARCHAR(255),
  `user_barcode` VARCHAR(255),
  `description` TEXT,
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `vendor_contribution_percent` DECIMAL(15,2) DEFAULT 0.00,
  `vendor_contribution_amount` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `purchase_order_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_order_items`;
CREATE TABLE `purchase_order_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `purchase_order_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `qty` INT DEFAULT 0,
  `pur_price` DECIMAL(15,2) DEFAULT 0.00,
  `mrp_price` DECIMAL(15,2) DEFAULT 0.00,
  `disc_percent` DECIMAL(15,2) DEFAULT 0.00,
  `free_qty` INT DEFAULT 0,
  `line_notes` LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_order_items` (20 rows)
INSERT INTO `purchase_order_items` (`id`, `purchase_order_id`, `product_id`, `qty`, `pur_price`, `mrp_price`, `disc_percent`, `free_qty`, `line_notes`) VALUES
('962b4ce6-6c68-4ac8-bd1e-0325c2206a53', '9b39de1b-6d45-48ff-a817-5375eba4f66e', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 410, 742, 0, 0, ''),
('4efe73e8-8046-478b-8642-6e316f615c09', '9b39de1b-6d45-48ff-a817-5375eba4f66e', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 370.5, 591, 0, 0, ''),
('4cadcda5-d84b-4b87-b0da-f986350a0ac2', '02b7f1ba-ba1a-42f3-a3d3-4862eef90c66', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 410, 742, 0, 0, ''),
('363907d5-17b9-444e-bc04-f381875217ac', '02b7f1ba-ba1a-42f3-a3d3-4862eef90c66', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 370.5, 591, 0, 0, ''),
('c2d148a2-e7bf-4280-aec8-8de87c473afe', '95fe29e8-c90e-478d-860e-62744789b647', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 410, 742, 0, 0, ''),
('35965b45-4ccf-4498-a52b-a481227349a0', '6e8aa534-903a-45d7-854a-7f827d07f6a0', '7880bfd9-1128-46dd-b37f-df879d0df265', 10, 720, 1129, 0, 0, ''),
('6cd556ba-399f-4e1b-a006-529f66f58b4b', '70789fc0-06fd-41c4-a9eb-62936a9b23ca', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 50, 450, 890, 0, 0, ''),
('cca23b44-d9d2-4113-87a0-9a823558d3c5', '92c8b142-b14c-4aba-86c6-765ccb1bf733', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 410, 742, 0, 0, ''),
('91c650bf-f7cb-4cf4-bbed-8c5c7d203eaa', '92c8b142-b14c-4aba-86c6-765ccb1bf733', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 10, 450, 890, 0, 0, ''),
('9178975f-b7ec-486d-9137-c9c52ccef58f', '92c8b142-b14c-4aba-86c6-765ccb1bf733', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 10, 490, 990, 0, 0, ''),
('a808acfe-84aa-4ca9-aaa7-a4d9987279c3', '92c8b142-b14c-4aba-86c6-765ccb1bf733', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 370.5, 591, 0, 0, ''),
('2ccfca89-f6dc-4768-990d-1a5b501133a8', '30b25483-a0ac-4a3a-a67d-5f8a37ebbe45', '7880bfd9-1128-46dd-b37f-df879d0df265', 100, 720, 1129, 0, 0, ''),
('3607d42f-bf43-4eeb-864c-2c2970b49911', '1e739694-ac3e-4b3d-8b7a-d69f419358b7', '6496f0ee-f784-4228-90a5-831d89e7cdeb', 100, 450, 850, 0, 0, ''),
('ed169289-9ae2-419e-86e9-42128d9adf50', 'c59fe3e6-7861-4b99-9fe3-4184c66ee2a8', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 1, 450, 890, 0, 0, ''),
('0f1a1b0a-bb90-40d8-9b40-11f0dd4364a9', 'c59fe3e6-7861-4b99-9fe3-4184c66ee2a8', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 1, 490, 990, 0, 0, ''),
('07841f89-5791-48ec-88ef-98d1de024503', 'c59fe3e6-7861-4b99-9fe3-4184c66ee2a8', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 1, 370.5, 591, 0, 0, ''),
('bf80e502-f4c1-4fd1-aa38-d119b82fb094', '8704ac24-e430-4452-b5a6-6df4eed93e1c', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 5, 410, 742, 0, 0, ''),
('94085091-1348-46f5-887b-e8e2a7b9b90b', '8704ac24-e430-4452-b5a6-6df4eed93e1c', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 2, 450, 890, 0, 0, ''),
('89e3cdd9-5323-47e1-a9a7-0eda1eef8c79', '8704ac24-e430-4452-b5a6-6df4eed93e1c', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 6, 490, 990, 0, 0, ''),
('49d706a2-e445-41b2-a14d-4cc2b12beca4', '8704ac24-e430-4452-b5a6-6df4eed93e1c', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 5, 370.5, 591, 0, 0, '');

-- --------------------------------------------------------
-- Table structure for table `purchase_orders`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `vendor_id` VARCHAR(64),
  `supplier_payment_type` VARCHAR(255),
  `order_date` VARCHAR(64),
  `delivery_date` VARCHAR(64),
  `reference_no` VARCHAR(255),
  `start_date` VARCHAR(64),
  `end_date` VARCHAR(64),
  `delivery_to` VARCHAR(255),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64),
  `po_number` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_orders` (10 rows)
INSERT INTO `purchase_orders` (`id`, `vendor_id`, `supplier_payment_type`, `order_date`, `delivery_date`, `reference_no`, `start_date`, `end_date`, `delivery_to`, `status`, `created_at`, `updated_at`, `po_number`) VALUES
('02b7f1ba-ba1a-42f3-a3d3-4862eef90c66', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-06-24', '2026-06-24', '', '2026-06-24', '2026-06-24', 'Central Store', 'Received', '2026-06-24T07:01:25.039769+00:00', '2026-06-24T07:01:25.039769+00:00', NULL),
('9b39de1b-6d45-48ff-a817-5375eba4f66e', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-06-24', '2026-06-24', '', '2026-06-24', '2026-06-24', 'Central Store', 'Received', '2026-06-24T06:55:23.382386+00:00', '2026-06-24T06:55:23.382386+00:00', NULL),
('95fe29e8-c90e-478d-860e-62744789b647', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-06-27', '2026-06-27', '', '2026-06-27', '2026-06-27', 'Central Store', 'Received', '2026-06-27T03:42:40.078495+00:00', '2026-06-27T03:42:40.078495+00:00', NULL),
('70789fc0-06fd-41c4-a9eb-62936a9b23ca', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-07-13', '2026-07-13', 'KP-JFP-13072026/Huate/01', '2026-07-13', '2026-07-13', 'JAMUNA FUTURE PARK', 'Received', '2026-07-13T06:29:28.32776+00:00', '2026-07-13T06:29:28.32776+00:00', 'PO20260713001'),
('92c8b142-b14c-4aba-86c6-765ccb1bf733', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-07-15', '2026-07-15', '', '2026-07-15', '2026-07-15', 'Central Store', 'Received', '2026-07-15T04:17:12.30594+00:00', '2026-07-15T04:17:12.30594+00:00', 'PO20260715001'),
('30b25483-a0ac-4a3a-a67d-5f8a37ebbe45', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 'CashPurchase', '2026-07-16', '2026-07-16', '', '2026-07-16', '2026-07-16', 'Central Store', 'Received', '2026-07-16T09:21:09.461578+00:00', '2026-07-16T09:21:09.461578+00:00', 'PO20260716001'),
('6e8aa534-903a-45d7-854a-7f827d07f6a0', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 'CashPurchase', '2026-06-28', '2026-06-28', '', '2026-06-28', '2026-06-28', 'Central Store', 'Received', '2026-06-28T05:07:04.565592+00:00', '2026-06-28T05:07:04.565592+00:00', 'PO20260628001'),
('1e739694-ac3e-4b3d-8b7a-d69f419358b7', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 'CashPurchase', '2026-08-12', '2026-08-12', '', '2026-08-12', '2026-08-12', 'Central Store', 'Received', '2026-08-12T04:10:32.769831+00:00', '2026-08-12T04:10:32.769831+00:00', 'PO20260812001'),
('c59fe3e6-7861-4b99-9fe3-4184c66ee2a8', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CreditPurchase', '2026-08-21', '2026-08-21', '', '2026-08-21', '2026-08-21', 'Banani Model Town', 'Received', '2026-08-21T10:17:10.238669+00:00', '2026-08-21T10:17:10.238669+00:00', 'PO20260821001'),
('8704ac24-e430-4452-b5a6-6df4eed93e1c', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'CashPurchase', '2026-08-24', '2026-08-24', '', '2026-08-24', '2026-08-24', 'Banani Model Town', 'Saved', '2026-08-24T09:19:07.226944+00:00', '2026-08-24T09:19:07.226944+00:00', 'PO20260824001');

-- --------------------------------------------------------
-- Table structure for table `purchase_receive_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_receive_items`;
CREATE TABLE `purchase_receive_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `purchase_receive_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `po_qty` INT DEFAULT 0,
  `rcv_qty` INT DEFAULT 0,
  `pur_price` DECIMAL(15,2) DEFAULT 0.00,
  `sale_price` DECIMAL(15,2) DEFAULT 0.00,
  `disc_percent` DECIMAL(15,2) DEFAULT 0.00,
  `free_qty` INT DEFAULT 0,
  `line_amount` DECIMAL(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_receive_items` (21 rows)
INSERT INTO `purchase_receive_items` (`id`, `purchase_receive_id`, `product_id`, `po_qty`, `rcv_qty`, `pur_price`, `sale_price`, `disc_percent`, `free_qty`, `line_amount`) VALUES
('3df9310c-6916-47ce-9a04-b13e970e4045', 'e8e76877-90bc-46e4-a6a8-7aaffb6c061f', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, 410, 742, 0, 0, 4407.5),
('4c606e8f-d71c-46de-90d0-82ee8ce17eba', 'e8e76877-90bc-46e4-a6a8-7aaffb6c061f', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 10, 370.5, 591, 0, 0, 3982.875),
('e2a996ad-ba08-4ef8-84f2-86906cc322b2', '62f17b6f-920c-43de-bd3a-bb40f8a0c33b', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, 410, 742, 0, 0, 4407.5),
('0e38829f-8cf5-4605-89b0-19670b2ce73c', '62f17b6f-920c-43de-bd3a-bb40f8a0c33b', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 10, 370.5, 591, 0, 0, 3982.875),
('3c33cb8c-fb87-43dc-b446-b3001a4afa66', '83259886-e20d-4000-9828-bf82e3b2ef4d', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, 410, 742, 0, 0, 4407.5),
('8d9be44f-8d74-484b-b75c-69e80bdeb85e', '83259886-e20d-4000-9828-bf82e3b2ef4d', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 10, 370.5, 591, 0, 0, 3982.875),
('4da5d4af-6599-4bfd-87ff-d0cd8f4e2612', '20c0088c-deae-41d2-bdda-631b6c4ec358', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 5, 410, 742, 0, 0, 2203.75),
('e4d5cd2b-4d7d-4ac7-b6a2-0d024c734064', '20c0088c-deae-41d2-bdda-631b6c4ec358', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 5, 370.5, 591, 0, 0, 1991.4375),
('70ae7760-95b7-4785-9dd6-102f4136e51c', 'c870f4af-a144-4e86-92f3-af1fd9bf12da', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 5, 410, 742, 0, 0, 2203.75),
('8a5beb41-8a38-4334-a640-a71229e44a12', '614caee6-08aa-4fe8-ad4d-3ca533b36fcc', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 5, 5, 410, 742, 0, 0, 2203.75),
('dd229edb-820d-49ba-bd80-5f0848982198', '02549540-96ed-432f-a124-679d3099a48d', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 50, 50, 450, 890, 0, 0, 24187.5),
('fac755f0-8414-48b5-a0ff-acbdda0a1114', '91bf0824-9be2-47a7-8125-24b69f30c7d0', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, 410, 742, 0, 0, 4407.5),
('31179a7a-386d-4266-b5d9-226bd8995c0c', '91bf0824-9be2-47a7-8125-24b69f30c7d0', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 10, 10, 450, 890, 0, 0, 4837.5),
('130cf9ab-5cc0-4e8c-9f97-c884cc77e954', '91bf0824-9be2-47a7-8125-24b69f30c7d0', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 10, 10, 490, 990, 0, 0, 5267.5),
('af9f0d3a-09d9-475b-92b2-a0decd973ab0', '91bf0824-9be2-47a7-8125-24b69f30c7d0', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 10, 10, 370.5, 591, 0, 0, 3982.875),
('6ff8c094-a6d9-4251-84ac-4fa1988b04d1', 'a523bf2a-fad1-4b6a-b884-8eb20b3ab08a', '7880bfd9-1128-46dd-b37f-df879d0df265', 100, 100, 720, 1129, 0, 0, 77400),
('55f33c63-9357-4d53-8a4e-5bd0a6d6ab37', '056fe2a2-912e-478f-94a1-1cd319770801', '7880bfd9-1128-46dd-b37f-df879d0df265', NULL, 85, 720, 1129, 0, 0, 65790),
('06d9f590-e27f-4d60-8d9c-dd2e327603e2', 'c3c11872-10a8-457b-804a-44a759d4dc35', '6496f0ee-f784-4228-90a5-831d89e7cdeb', 100, 100, 450, 850, 0, 0, 48375),
('8f1c907f-1061-460a-826e-abdf865aaf83', 'b103f065-f088-49ac-bfc1-9bb97eb76efb', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 1, 2, 450, 890, 0, 0, 967.5),
('c3e4247f-2925-4daf-9816-d57c4efc2618', 'b103f065-f088-49ac-bfc1-9bb97eb76efb', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 1, 2, 490, 990, 0, 0, 1053.5),
('6e042e28-9a6d-4669-b4ff-6afe7e0c276d', 'b103f065-f088-49ac-bfc1-9bb97eb76efb', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', 1, 2, 370.5, 591, 0, 0, 796.575);

-- --------------------------------------------------------
-- Table structure for table `purchase_receives`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_receives`;
CREATE TABLE `purchase_receives` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `vendor_id` VARCHAR(64),
  `purchase_order_id` VARCHAR(64),
  `from_date` VARCHAR(64),
  `to_date` VARCHAR(64),
  `purchase_date` VARCHAR(64),
  `last_challan_no` VARCHAR(255),
  `reference_no` VARCHAR(255),
  `delivery_to` VARCHAR(255),
  `status` VARCHAR(255),
  `total_value` DECIMAL(15,2) DEFAULT 0.00,
  `total_discount` DECIMAL(15,2) DEFAULT 0.00,
  `free_amount` DECIMAL(15,2) DEFAULT 0.00,
  `vat_amount` DECIMAL(15,2) DEFAULT 0.00,
  `sub_total` DECIMAL(15,2) DEFAULT 0.00,
  `additional_discount` DECIMAL(15,2) DEFAULT 0.00,
  `additional_cost` DECIMAL(15,2) DEFAULT 0.00,
  `net_amount` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_receives` (12 rows)
INSERT INTO `purchase_receives` (`id`, `vendor_id`, `purchase_order_id`, `from_date`, `to_date`, `purchase_date`, `last_challan_no`, `reference_no`, `delivery_to`, `status`, `total_value`, `total_discount`, `free_amount`, `vat_amount`, `sub_total`, `additional_discount`, `additional_cost`, `net_amount`, `created_at`, `updated_at`) VALUES
('e8e76877-90bc-46e4-a6a8-7aaffb6c061f', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '9b39de1b-6d45-48ff-a817-5375eba4f66e', '2026-06-24', '2026-06-24', '2026-06-24', '', '', 'Central Store', 'Saved', 7805, 0, 0, 585.375, 8390.375, 0, 0, 8390.375, '2026-06-24T09:34:10.797488+00:00', '2026-06-24T09:34:10.797488+00:00'),
('62f17b6f-920c-43de-bd3a-bb40f8a0c33b', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '02b7f1ba-ba1a-42f3-a3d3-4862eef90c66', '2026-06-24', '2026-06-24', '2026-06-24', '', '', 'Central Store', 'Saved', 7805, 0, 0, 585.375, 8390.375, 0, 0, 8390.375, '2026-06-24T09:35:51.530412+00:00', '2026-06-24T09:35:51.530412+00:00'),
('83259886-e20d-4000-9828-bf82e3b2ef4d', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '02b7f1ba-ba1a-42f3-a3d3-4862eef90c66', '2026-06-24', '2026-06-24', '2026-06-24', 'CN20260624001', 'CN20260624001', 'Central Store', 'Saved', 7805, 0, 0, 585.375, 8390.375, 0, 0, 8390.375, '2026-06-24T09:42:55.201514+00:00', '2026-06-24T09:42:55.201514+00:00'),
('20c0088c-deae-41d2-bdda-631b6c4ec358', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '9b39de1b-6d45-48ff-a817-5375eba4f66e', '2026-06-24', '2026-06-24', '2026-06-24', 'CN20260624002', 'CN20260624002', 'Central Store', 'Saved', 3902.5, 0, 0, 292.6875, 4195.1875, 0, 0, 4195.1875, '2026-06-24T11:28:46.127645+00:00', '2026-06-24T11:28:46.127645+00:00'),
('c870f4af-a144-4e86-92f3-af1fd9bf12da', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '95fe29e8-c90e-478d-860e-62744789b647', '2026-06-27', '2026-06-27', '2026-06-27', 'CN20260627001', 'CN20260627001', 'Central Store', 'Saved', 2050, 0, 0, 153.75, 2203.75, 0, 0, 2203.75, '2026-06-27T03:42:59.5849+00:00', '2026-06-27T03:42:59.5849+00:00'),
('614caee6-08aa-4fe8-ad4d-3ca533b36fcc', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '95fe29e8-c90e-478d-860e-62744789b647', '2026-06-27', '2026-06-27', '2026-06-27', 'CN20260627002', 'CN20260627002', 'Central Store', 'Saved', 2050, 0, 0, 153.75, 2203.75, 0, 0, 2203.75, '2026-06-27T03:45:23.742685+00:00', '2026-06-27T03:45:23.742685+00:00'),
('02549540-96ed-432f-a124-679d3099a48d', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '70789fc0-06fd-41c4-a9eb-62936a9b23ca', '2026-07-13', '2026-07-13', '2026-07-13', 'CN20260713001', 'CN20260713001', 'Shop', 'Saved', 22500, 0, 0, 1687.5, 24187.5, 0, 0, 24187.5, '2026-07-13T06:29:56.156032+00:00', '2026-07-13T06:29:56.156032+00:00'),
('91bf0824-9be2-47a7-8125-24b69f30c7d0', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '92c8b142-b14c-4aba-86c6-765ccb1bf733', '2026-07-15', '2026-07-15', '2026-07-15', 'CN20260715001', 'CN20260715001', 'Central Store', 'Saved', 17205, 0, 0, 1290.375, 18495.375, 0, 0, 18495.375, '2026-07-15T04:17:31.610212+00:00', '2026-07-15T04:17:31.610212+00:00'),
('a523bf2a-fad1-4b6a-b884-8eb20b3ab08a', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', '30b25483-a0ac-4a3a-a67d-5f8a37ebbe45', '2026-07-16', '2026-07-16', '2026-07-16', 'CN20260716001', 'CN20260716001', 'Central Store', 'Saved', 72000, 0, 0, 5400, 77400, 0, 0, 77400, '2026-07-16T09:21:35.544988+00:00', '2026-07-16T09:21:35.544988+00:00'),
('056fe2a2-912e-478f-94a1-1cd319770801', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', '6e8aa534-903a-45d7-854a-7f827d07f6a0', '2026-08-11', '2026-08-11', '2026-08-11', 'CN20260811001', 'CN20260811001', 'Banani Model Town', 'Saved', 61200, 0, 0, 4590, 65790, 0, 0, 65790, '2026-08-11T10:47:23.717544+00:00', '2026-08-11T10:47:23.717544+00:00'),
('c3c11872-10a8-457b-804a-44a759d4dc35', 'ae6fc5fd-76f9-41a0-b271-3d7386d267f2', '1e739694-ac3e-4b3d-8b7a-d69f419358b7', '2026-08-12', '2026-08-12', '2026-08-12', 'CN20260812001', 'CN20260812001', 'Central Store', 'Saved', 45000, 0, 0, 3375, 48375, 0, 0, 48375, '2026-08-12T04:12:29.625903+00:00', '2026-08-12T04:12:29.625903+00:00'),
('b103f065-f088-49ac-bfc1-9bb97eb76efb', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'c59fe3e6-7861-4b99-9fe3-4184c66ee2a8', '2026-08-21', '2026-08-21', '2026-08-21', 'CN20260821001', 'CN20260821001', 'Central Store', 'Saved', 2621, 0, 0, 196.575, 2817.575, 0, 0, 2817.575, '2026-08-21T10:18:55.435944+00:00', '2026-08-21T10:18:55.435944+00:00');

-- --------------------------------------------------------
-- Table structure for table `purchase_return_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_return_items`;
CREATE TABLE `purchase_return_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `purchase_return_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `return_qty` INT DEFAULT 0,
  `cost_price` DECIMAL(15,2) DEFAULT 0.00,
  `sale_price` DECIMAL(15,2) DEFAULT 0.00,
  `line_amount` DECIMAL(15,2) DEFAULT 0.00,
  `return_reason` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_return_items` (2 rows)
INSERT INTO `purchase_return_items` (`id`, `purchase_return_id`, `product_id`, `return_qty`, `cost_price`, `sale_price`, `line_amount`, `return_reason`) VALUES
('24cbadb4-bc09-4b4b-b6aa-776e275f2cd1', '350cfaf4-4a51-473a-b23d-583710c964e2', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 5, 410, 742, 2050, 'Damaged'),
('80f455dc-31b1-4250-b907-7a9bb4c682a8', '220c6f2d-7a6f-4d6a-b11d-15fc7f95906f', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 5, 410, 742, 2050, 'Damaged');

-- --------------------------------------------------------
-- Table structure for table `purchase_returns`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `purchase_returns`;
CREATE TABLE `purchase_returns` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `vendor_id` VARCHAR(64),
  `purchase_receive_id` VARCHAR(64),
  `return_date` VARCHAR(64),
  `challan_no` VARCHAR(255),
  `reference_no` VARCHAR(255),
  `total_amount` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `purchase_returns` (2 rows)
INSERT INTO `purchase_returns` (`id`, `vendor_id`, `purchase_receive_id`, `return_date`, `challan_no`, `reference_no`, `total_amount`, `created_at`) VALUES
('350cfaf4-4a51-473a-b23d-583710c964e2', 'b1badfbd-4065-440a-b680-91ad1f02aacc', 'c870f4af-a144-4e86-92f3-af1fd9bf12da', '2026-06-27', 'CN20260627001', 'CN20260627001', 2050, '2026-06-27T03:45:04.434491+00:00'),
('220c6f2d-7a6f-4d6a-b11d-15fc7f95906f', 'b1badfbd-4065-440a-b680-91ad1f02aacc', '91bf0824-9be2-47a7-8125-24b69f30c7d0', '2026-07-15', 'CN20260715001', 'CN20260715001', 2050, '2026-07-15T04:45:13.54606+00:00');

-- --------------------------------------------------------
-- Table structure for table `reprint_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `reprint_logs`;
CREATE TABLE `reprint_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `invoice_no` VARCHAR(255),
  `reprinted_by` VARCHAR(255),
  `reason` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `requisition_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `requisition_items`;
CREATE TABLE `requisition_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `requisition_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `req_qty` INT DEFAULT 0,
  `approve_qty` INT DEFAULT 0,
  `barcode` VARCHAR(255),
  `product_code` VARCHAR(255),
  `product_name` VARCHAR(255),
  `cpu` DECIMAL(15,2) DEFAULT 0.00,
  `mrp` DECIMAL(15,2) DEFAULT 0.00,
  `cost_value` DECIMAL(15,2) DEFAULT 0.00,
  `bal_qty` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `requisition_items` (19 rows)
INSERT INTO `requisition_items` (`id`, `requisition_id`, `product_id`, `req_qty`, `approve_qty`, `barcode`, `product_code`, `product_name`, `cpu`, `mrp`, `cost_value`, `bal_qty`) VALUES
('d729230b-4a6c-4daa-b312-e706716ad5f1', '094ee1de-cda7-4f29-902d-b907e821abf0', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, '1001100002', '1001100002', 'Baby Converse (3W486)', 410, 742, 4100, 41),
('712a161f-c325-4d3c-b2d9-cf2e50c9197d', '81e1f62e-6184-4f81-ac23-d88840940b2c', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 6, 6, '1001100002', '1001100002', 'Baby Converse (3W486)', 410, 742, 2460, 36),
('58447454-5983-4b12-bc1d-a1ff77faf38d', 'ac865031-4972-46d0-9af8-429871bf7791', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 10, 10, '1001100004', '1001100004', 'Baby Shoes (5458)', 450, 890, 4500, 60),
('512eb53d-1bed-40bd-8e62-34be31962a9c', 'd19a92b2-423f-4fd7-be3e-184761fa894b', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 10, '1001100002', '1001100002', 'Baby Converse (3W486)', NULL, 742, NULL, NULL),
('bcb888a0-d6e7-4f24-8ec0-ea0783491f9a', '5fb94f2c-73bd-467c-bae1-3a2b7e178143', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 6, 6, '1001100002', '1001100002', 'Baby Converse (3W486)', NULL, 742, NULL, NULL),
('5c0b4281-806b-4986-a058-72f2015d55f4', '019711e8-e8cc-46c0-8ff0-edca03249d21', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 10, 10, '1001100004', '1001100004', 'Baby Shoes (5458)', NULL, 890, NULL, NULL),
('3131c013-be9b-41aa-8bd7-1ebde1d1e09c', 'fba17c74-3dcf-4a99-ac0f-1dd118c78a34', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 10, 10, '1001100004', '1001100004', 'Baby Shoes (5458)', NULL, 890, NULL, NULL),
('285d2ac6-9706-4046-a32f-fadb4da3c84a', 'e3638511-105a-4cf7-85f8-a715a08de07c', '7880bfd9-1128-46dd-b37f-df879d0df265', 10, 10, '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', 720, 1129, 7200, 100),
('7517d378-f410-4ea7-ae2a-527cfc42ff82', '81377ed4-a4e1-4a09-9681-90e33b9b29ad', '7880bfd9-1128-46dd-b37f-df879d0df265', 10, 10, '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', 720, 1129, 7200, 100),
('49b35453-f7f1-40ae-8bbb-d6a80dc034d2', '8849853d-795b-4d51-8df2-5076384ea6e0', '7880bfd9-1128-46dd-b37f-df879d0df265', 10, 10, '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', NULL, 1129, NULL, NULL),
('ea1a1c24-90c8-488f-86e2-674b4a392f48', 'af2eed4c-767a-4f4e-b9a7-02050652c722', '7880bfd9-1128-46dd-b37f-df879d0df265', 10, 10, '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', NULL, 1129, NULL, NULL),
('07ce918e-6d70-4d2b-b667-8e39a0179527', 'e7ff8c08-0d82-44ac-abdb-4b605e2c2a28', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 1, 1, '1001100004', 'A000004', 'Baby Shoes (5458)', 450, 890, 450, 18),
('24eee1ab-6052-426c-b870-c018ac65cd52', 'acd6e679-e0ff-4f59-a060-614dde17f694', '6496f0ee-f784-4228-90a5-831d89e7cdeb', 10, 10, '1001100006', '1001100006', 'Avent Natural Nipple 0m+', 450, 850, 4500, 100),
('53fa89b4-9aef-428a-8779-b35f909761a1', '57dec82d-f69d-4260-aa6b-9452fba98820', '6496f0ee-f784-4228-90a5-831d89e7cdeb', 10, 10, '1001100006', '1001100006', 'Avent Natural Nipple 0m+', NULL, 850, NULL, NULL),
('cf5cc572-93d8-4ddb-8cea-e9a9d52c3b78', '3aeac168-906f-46b7-8623-64efd3801a92', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 13, 13, '1001100005', 'A000005', 'Boys Shandal (4785)', 490, 990, 6370, 0),
('0f31a60a-8395-4627-897c-da34b45746cc', '3aeac168-906f-46b7-8623-64efd3801a92', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 4, 4, '1001100004', 'A000004', 'Baby Shoes (5458)', 450, 890, 1800, 16),
('98b255c6-90a0-42a9-a093-4291d67c09c4', '9b2d6577-1760-4961-9a12-96f2fa4f3265', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 13, 13, '1001100005', 'A000005', 'Boys Shandal (4785)', NULL, 990, NULL, NULL),
('190a78c7-2b91-426c-be11-38b9e6f333de', '9b2d6577-1760-4961-9a12-96f2fa4f3265', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 4, 4, '1001100004', 'A000004', 'Baby Shoes (5458)', NULL, 890, NULL, NULL),
('b490be97-2a05-432b-a967-a0bc8d8f261c', 'd6ef0d5b-7b7e-4efe-b1fa-7b4a2c6de80b', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 1, 1, '1001100004', 'A000004', 'Baby Shoes (5458)', NULL, 890, NULL, NULL);

-- --------------------------------------------------------
-- Table structure for table `requisitions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `requisitions`;
CREATE TABLE `requisitions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `shop_id` VARCHAR(64),
  `requisition_no` VARCHAR(255),
  `requisition_date` VARCHAR(64),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64),
  `challan_no` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `requisitions` (19 rows)
INSERT INTO `requisitions` (`id`, `shop_id`, `requisition_no`, `requisition_date`, `status`, `created_at`, `challan_no`) VALUES
('094ee1de-cda7-4f29-902d-b907e821abf0', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260715942', '2026-07-15', 'Received', '2026-07-15T09:29:28.063552+00:00', 'DLV20260715942'),
('81e1f62e-6184-4f81-ac23-d88840940b2c', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260715228', '2026-07-15', 'Received', '2026-07-15T10:21:02.050785+00:00', 'DLV20260715228'),
('ac865031-4972-46d0-9af8-429871bf7791', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260715655', '2026-07-15', 'Received', '2026-07-15T10:25:21.691558+00:00', 'DLV20260715655'),
('d19a92b2-423f-4fd7-be3e-184761fa894b', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607159548', '2026-07-15', 'Received', '2026-07-15T12:49:00.501763+00:00', 'DLV20260715942'),
('92d41be7-2718-4299-a583-165d422b5c1a', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607163975', '2026-07-16', 'Receive Challan', '2026-07-16T07:03:37.199144+00:00', 'DLV20260715942'),
('5fb94f2c-73bd-467c-bae1-3a2b7e178143', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607153375', '2026-07-15', 'Received', '2026-07-15T12:49:01.136025+00:00', 'DLV20260715228'),
('7b00bc08-e4bf-4ede-a2b6-38f8b3198109', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607161244', '2026-07-16', 'Receive Challan', '2026-07-16T07:06:00.326748+00:00', 'DLV20260715228'),
('019711e8-e8cc-46c0-8ff0-edca03249d21', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607153246', '2026-07-15', 'Received', '2026-07-15T12:49:01.753512+00:00', 'DLV20260715655'),
('fba17c74-3dcf-4a99-ac0f-1dd118c78a34', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607163674', '2026-07-16', 'Receive Challan', '2026-07-16T07:09:09.647965+00:00', 'DLV20260715655'),
('e3638511-105a-4cf7-85f8-a715a08de07c', 'b11e0746-c49a-43a2-ae39-41f829846213', 'REQ20260716870', '2026-07-16', 'Received', '2026-07-16T09:26:37.467246+00:00', 'DLV20260716870'),
('8849853d-795b-4d51-8df2-5076384ea6e0', 'b11e0746-c49a-43a2-ae39-41f829846213', 'SDR202607161018', '2026-07-16', 'Receive Challan', '2026-07-16T09:30:06.764041+00:00', 'DLV20260716870'),
('81377ed4-a4e1-4a09-9681-90e33b9b29ad', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260716592', '2026-07-16', 'Received', '2026-07-16T09:28:36.933891+00:00', 'DLV20260716592'),
('af2eed4c-767a-4f4e-b9a7-02050652c722', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202607186260', '2026-07-18', 'Receive Challan', '2026-07-18T05:23:22.409557+00:00', 'DLV20260716592'),
('acd6e679-e0ff-4f59-a060-614dde17f694', 'b11e0746-c49a-43a2-ae39-41f829846213', 'REQ20260812978', '2026-08-12', 'Received', '2026-08-12T04:13:59.879739+00:00', 'DLV20260812978'),
('57dec82d-f69d-4260-aa6b-9452fba98820', 'b11e0746-c49a-43a2-ae39-41f829846213', 'SDR202608125079', '2026-08-12', 'Receive Challan', '2026-08-12T04:16:05.77243+00:00', 'DLV20260812978'),
('3aeac168-906f-46b7-8623-64efd3801a92', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260821001', '2026-08-21', 'Received', '2026-08-21T12:22:33.424+00:00', NULL),
('9b2d6577-1760-4961-9a12-96f2fa4f3265', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202608248957', '2026-08-24', 'Receive Challan', '2026-08-24T09:21:55.57984+00:00', 'REQ20260821001'),
('e7ff8c08-0d82-44ac-abdb-4b605e2c2a28', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'REQ20260811001', '2026-08-11', 'Received', '2026-08-11T10:25:36.69+00:00', NULL),
('d6ef0d5b-7b7e-4efe-b1fa-7b4a2c6de80b', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'SDR202608247876', '2026-08-24', 'Receive Challan', '2026-08-24T09:27:16.071778+00:00', 'REQ20260811001');

-- --------------------------------------------------------
-- Table structure for table `sale_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sale_id` VARCHAR(64),
  `invoice_no` VARCHAR(255),
  `product_id` VARCHAR(64),
  `barcode` VARCHAR(255),
  `user_barcode` VARCHAR(255),
  `product_name` VARCHAR(255),
  `unit_price` DECIMAL(15,2) DEFAULT 0.00,
  `qty` INT DEFAULT 0,
  `sd_percent` DECIMAL(15,2) DEFAULT 0.00,
  `sd_amount` DECIMAL(15,2) DEFAULT 0.00,
  `vat_percent` DECIMAL(15,2) DEFAULT 0.00,
  `vat_amount` DECIMAL(15,2) DEFAULT 0.00,
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `total_value` DECIMAL(15,2) DEFAULT 0.00,
  `sales_executive_id` VARCHAR(64),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `sale_items` (13 rows)
INSERT INTO `sale_items` (`id`, `sale_id`, `invoice_no`, `product_id`, `barcode`, `user_barcode`, `product_name`, `unit_price`, `qty`, `sd_percent`, `sd_amount`, `vat_percent`, `vat_amount`, `discount_percent`, `discount_amount`, `total_value`, `sales_executive_id`, `created_at`) VALUES
('2fe5a159-2cde-4482-9fdd-7d283ade290c', 'a3a82975-17a3-4578-91d3-df9cddf26512', '0100020000001', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-11T04:21:18.771698+00:00'),
('83b76106-0372-4fa8-8e7d-e3014515f5c4', 'a76a948b-7db7-43bd-a96f-7eb8448ecd74', '0100020000002', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-11T09:59:29.582342+00:00'),
('7e3d1b30-5831-46e4-ae3c-05ac03b6e0e6', 'f2761684-023e-4c87-b99c-50acb8aedbc7', '0100020000003', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-21T10:32:10.641319+00:00'),
('4924fb05-3139-4a5d-a32b-7c380950ac8b', '691feb68-f224-4b9f-8e70-10e15523ee6f', '0100020000004', '7880bfd9-1128-46dd-b37f-df879d0df265', '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', 1129, 5, 0, 0, 7.5, 423.38, 0, 0, 6068.38, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-21T10:35:04.08714+00:00'),
('7664c183-f64e-4696-b7a4-19a371708d86', '691feb68-f224-4b9f-8e70-10e15523ee6f', '0100020000004', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', '1001100001', '1001100001', 'Kids Shoe', 591, 1, 0, 0, 7.5, 44.33, 0, 0, 635.33, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-21T10:35:04.08714+00:00'),
('bc12178f-edd2-41e2-91c2-24fa5b1ba110', '691feb68-f224-4b9f-8e70-10e15523ee6f', '0100020000004', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'f38e83d8-d022-4ce6-be67-15d945803795', '2026-08-21T10:35:04.08714+00:00'),
('826b6767-ce30-43ac-b698-19a8d3f73de3', 'aa30e756-cc1e-4642-bd9d-79d32637c498', '0100020000005', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', '1001100001', '1001100001', 'Kids Shoe', 591, 1, 0, 0, 7.5, 44.33, 0, 0, 635.33, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-22T04:10:13.102914+00:00'),
('db6ac55a-9014-47ab-aaba-a753224aec0b', 'aa30e756-cc1e-4642-bd9d-79d32637c498', '0100020000005', '7880bfd9-1128-46dd-b37f-df879d0df265', '1001100003', '1001100003', 'Avent Feeding Bottle 330ml', 1129, 1, 0, 0, 7.5, 84.68, 0, 0, 1213.68, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-22T04:10:13.102914+00:00'),
('61a807de-6814-4e71-bba9-e3a2124da23e', '7c3c1d10-f433-404f-ad7f-7d1824a36850', '0100020000006', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-22T04:30:22.530626+00:00'),
('dd661e3e-1ce7-4e1e-98f3-9ee63c48b53a', '5dd4669e-cf35-46e2-a24e-d91d29bb44ec', '0100020000007', '340efe82-7c0b-4db6-8a1c-dafccb4b4cc9', '1001100001', '', 'Kids Shoe', 591, 1, 0, 0, 7.5, 44.33, 0, 0, 591, NULL, '2026-08-22T05:31:44.821341+00:00'),
('7c1b9a94-b7b4-427a-99c4-e2c9d819a399', '5dd4669e-cf35-46e2-a24e-d91d29bb44ec', '0100020000007', '6496f0ee-f784-4228-90a5-831d89e7cdeb', '1001100006', '', 'Avent Natural Nipple 0m+', 850, 1, 0, 0, 7.5, 63.75, 0, 0, 850, NULL, '2026-08-22T05:31:44.821341+00:00'),
('1a363377-1aa9-4ff4-bf3f-8da31b162328', '196d79b2-c07f-484c-b500-766410cc82cc', '0100020000009', 'bd212d7c-abe6-4801-8365-81fcf94559c7', '1001100002', '1001100002', 'Baby Converse (3W486)', 742, 1, 0, 0, 7.5, 55.65, 0, 0, 797.65, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-24T09:32:49.880191+00:00'),
('0b06d74f-1f69-4479-8003-24be6e277426', 'f5e3e962-f757-4d9c-a9f2-bce3c8658881', '0100020000010', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', '1001100004', '1001100004', 'Baby Shoes (5458)', 890, 1, 0, 0, 7.5, 66.75, 0, 0, 956.75, 'ac266097-2ad7-449d-996c-826c9ece3c30', '2026-08-24T09:33:12.313132+00:00');

-- --------------------------------------------------------
-- Table structure for table `sales`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `invoice_no` VARCHAR(255),
  `sale_date` VARCHAR(64),
  `store_id` VARCHAR(64),
  `terminal_id` VARCHAR(64),
  `counter_no` VARCHAR(255),
  `sales_executive_id` VARCHAR(64),
  `sales_executive_name` VARCHAR(255),
  `customer_id` VARCHAR(64),
  `customer_name` VARCHAR(255),
  `customer_mobile` VARCHAR(255),
  `customer_address` LONGTEXT,
  `total_lines` INT DEFAULT 0,
  `total_qty` INT DEFAULT 0,
  `total_amount` DECIMAL(15,2) DEFAULT 0.00,
  `sd_amount` DECIMAL(15,2) DEFAULT 0.00,
  `vat_amount` DECIMAL(15,2) DEFAULT 0.00,
  `discount_percent` DECIMAL(15,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(15,2) DEFAULT 0.00,
  `return_amount` DECIMAL(15,2) DEFAULT 0.00,
  `redeem_points` DECIMAL(15,2) DEFAULT 0.00,
  `subtotal` DECIMAL(15,2) DEFAULT 0.00,
  `net_amount` DECIMAL(15,2) DEFAULT 0.00,
  `paid_amount` DECIMAL(15,2) DEFAULT 0.00,
  `change_amount` DECIMAL(15,2) DEFAULT 0.00,
  `invoice_note` LONGTEXT,
  `status` VARCHAR(255),
  `created_at` VARCHAR(64),
  `created_by` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `sales` (9 rows)
INSERT INTO `sales` (`id`, `invoice_no`, `sale_date`, `store_id`, `terminal_id`, `counter_no`, `sales_executive_id`, `sales_executive_name`, `customer_id`, `customer_name`, `customer_mobile`, `customer_address`, `total_lines`, `total_qty`, `total_amount`, `sd_amount`, `vat_amount`, `discount_percent`, `discount_amount`, `return_amount`, `redeem_points`, `subtotal`, `net_amount`, `paid_amount`, `change_amount`, `invoice_note`, `status`, `created_at`, `created_by`) VALUES
('a3a82975-17a3-4578-91d3-df9cddf26512', '0100020000001', '2026-08-11T04:21:17.03+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', NULL, 'Walk-in Customer', '', '', 1, 1, 890, 0, 66.75, 0, 0, 0, 0, 956.75, 957, 957, 0, '', 'COMPLETED', '2026-08-11T04:21:18.341846+00:00', 'd1249502-b6c9-4299-a5f9-72986fb85c43'),
('a76a948b-7db7-43bd-a96f-7eb8448ecd74', '0100020000002', '2026-08-11T09:59:27.621+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', '3fcf2668-2ac5-485f-aa37-3eeb2f1fb91a', 'Mr.X', '0123456789', 'Banani', 1, 1, 890, 0, 66.75, 0, 0, 0, 0, 956.75, 957, 957, 0, '', 'COMPLETED', '2026-08-11T09:59:29.200134+00:00', 'd1249502-b6c9-4299-a5f9-72986fb85c43'),
('f2761684-023e-4c87-b99c-50acb8aedbc7', '0100020000003', '2026-08-21T10:32:09.856+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', '0dba2097-4439-4aa7-9dea-44c362299d9a', 'Somaya', '01776899365', 'Dhaka', 1, 1, 890, 0, 66.75, 0, 0, 0, 0, 956.75, 957, 957, 0, '', 'COMPLETED', '2026-08-21T10:32:10.290503+00:00', 'f38e83d8-d022-4ce6-be67-15d945803795'),
('691feb68-f224-4b9f-8e70-10e15523ee6f', '0100020000004', '2026-08-21T10:35:03.583+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'f38e83d8-d022-4ce6-be67-15d945803795', 'Shakil Mahmud', NULL, 'Walk-in Customer', '', '', 3, 7, 7126, 0, 534.45, 0, 0, 0, 0, 7660.45, 7660, 7660, 0, '', 'COMPLETED', '2026-08-21T10:35:03.833396+00:00', 'f38e83d8-d022-4ce6-be67-15d945803795'),
('aa30e756-cc1e-4642-bd9d-79d32637c498', '0100020000005', '2026-08-22T04:10:12.153+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', '0dba2097-4439-4aa7-9dea-44c362299d9a', 'Somaya', '01776899365', 'Dhaka', 2, 2, 1720, 0, 129, 0, 0, 0, 0, 1849, 1849, 1849, 0, '', 'COMPLETED', '2026-08-22T04:10:12.502068+00:00', 'd1249502-b6c9-4299-a5f9-72986fb85c43'),
('7c3c1d10-f433-404f-ad7f-7d1824a36850', '0100020000006', '2026-08-22T04:30:21.568+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', '3fcf2668-2ac5-485f-aa37-3eeb2f1fb91a', 'Mr.X', '0123456789', 'Banani', 1, 1, 890, 0, 66.75, 0, 0, 0, 0, 956.75, 957, 957, 0, '[Payment: AMEX]', 'COMPLETED', '2026-08-22T04:30:22.183444+00:00', 'd1249502-b6c9-4299-a5f9-72986fb85c43'),
('5dd4669e-cf35-46e2-a24e-d91d29bb44ec', '0100020000007', '2026-08-22T05:31:43.293+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', NULL, 'Walk-in Customer', '', '', 2, 2, 1441, 0, 108.08, 0, 0, 956.75, 0, 592.33, 592, 592, 0, '[Payment: Cash] [Exchange: Returned INV#0100020000006 (Baby Shoes (5458), Tk 956.75) for 2 Items [Kids Shoe (x1), Avent Natural Nipple 0m+ (x1)], Total Tk 1441.00. Due Adjustment: Tk 484.25]', 'COMPLETED', '2026-08-22T05:31:44.187797+00:00', 'd1249502-b6c9-4299-a5f9-72986fb85c43'),
('196d79b2-c07f-484c-b500-766410cc82cc', '0100020000009', '2026-08-24T09:32:50.232+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', NULL, 'Walk-in Customer', '', '', 1, 1, 742, 0, 55.65, 0, 0, 0, 0, 797.65, 798, 798, 0, '[Payment: Cash]', 'COMPLETED', '2026-08-24T09:32:49.31235+00:00', 'f38e83d8-d022-4ce6-be67-15d945803795'),
('f5e3e962-f757-4d9c-a9f2-bce3c8658881', '0100020000010', '2026-08-24T09:33:13.023+00:00', '35babb6b-cdfb-4c61-840b-38810b5f3948', NULL, '01', 'ac266097-2ad7-449d-996c-826c9ece3c30', 'Ashraful', '3fcf2668-2ac5-485f-aa37-3eeb2f1fb91a', 'Mr.X', '0123456789', 'Banani', 1, 1, 890, 0, 66.75, 0, 0, 0, 0, 956.75, 957, 957, 0, '[Payment: Cash]', 'COMPLETED', '2026-08-24T09:33:12.077963+00:00', 'f38e83d8-d022-4ce6-be67-15d945803795');

-- --------------------------------------------------------
-- Table structure for table `sales_payments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales_payments`;
CREATE TABLE `sales_payments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sale_id` VARCHAR(64),
  `invoice_no` VARCHAR(255),
  `payment_type` VARCHAR(255),
  `machine_no` VARCHAR(255),
  `card_no` VARCHAR(255),
  `amount` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `sales_payments` (4 rows)
INSERT INTO `sales_payments` (`id`, `sale_id`, `invoice_no`, `payment_type`, `machine_no`, `card_no`, `amount`, `created_at`) VALUES
('edd59a5f-7544-4e60-b1bb-83f8536ebc0d', 'a76a948b-7db7-43bd-a96f-7eb8448ecd74', '0100020000002', 'AMEX', '123456', '1234567812345678', 900, '2026-08-11T09:59:30.217215+00:00'),
('07ea199d-8fcc-4de3-ab35-910e3ba4ec3f', 'aa30e756-cc1e-4642-bd9d-79d32637c498', '0100020000005', 'AMEX', '-', '1234567890123456', 1849, '2026-08-22T04:10:13.388657+00:00'),
('1684415f-cd63-4fcf-9a63-a6cae5e8a440', '7c3c1d10-f433-404f-ad7f-7d1824a36850', '0100020000006', 'AMEX', '-', '1234567890123456', 957, '2026-08-22T04:30:22.787585+00:00'),
('7b7a6fb1-a289-4b6d-91e0-45a46800e13e', '5dd4669e-cf35-46e2-a24e-d91d29bb44ec', '0100020000007', 'Cash', '-', '-', 592, '2026-08-22T05:31:45.122886+00:00');

-- --------------------------------------------------------
-- Table structure for table `sales_return_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales_return_items`;
CREATE TABLE `sales_return_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sales_return_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `qty` VARCHAR(255),
  `price` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `sales_returns`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sales_returns`;
CREATE TABLE `sales_returns` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `return_no` VARCHAR(255),
  `invoice_no` VARCHAR(255),
  `store_id` VARCHAR(64),
  `customer_id` VARCHAR(64),
  `total_amount` VARCHAR(255),
  `reason` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `shop_transfer_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `shop_transfer_items`;
CREATE TABLE `shop_transfer_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `transfer_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `qty` INT DEFAULT 0,
  `mrp` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `shop_transfer_items` (2 rows)
INSERT INTO `shop_transfer_items` (`id`, `transfer_id`, `product_id`, `qty`, `mrp`, `created_at`) VALUES
('9cff51df-a0f5-4208-9210-08418196902e', 'ff4151c9-060b-4a8d-b0f9-ee4069f98fbb', '7880bfd9-1128-46dd-b37f-df879d0df265', 5, 1129, '2026-07-18T04:51:46.069446+00:00'),
('29f3b8bb-4a50-4b50-b9ee-111b1d1ea727', '64b6e455-cd93-4f36-b64a-965af8518c65', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 10, 742, '2026-08-24T09:26:14.715212+00:00');

-- --------------------------------------------------------
-- Table structure for table `shop_transfers`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `shop_transfers`;
CREATE TABLE `shop_transfers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `shop_id` VARCHAR(64),
  `challan_no` VARCHAR(255),
  `challan_date` VARCHAR(64),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `shop_transfers` (2 rows)
INSERT INTO `shop_transfers` (`id`, `shop_id`, `challan_no`, `challan_date`, `status`, `created_at`) VALUES
('ff4151c9-060b-4a8d-b0f9-ee4069f98fbb', 'b11e0746-c49a-43a2-ae39-41f829846213', 'TRN202607161896', '2026-07-16', 'Received', '2026-07-16T10:53:40.994791+00:00'),
('64b6e455-cd93-4f36-b64a-965af8518c65', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'TRN202608242647', '2026-08-24', 'Pending', '2026-08-24T09:26:14.434104+00:00');

-- --------------------------------------------------------
-- Table structure for table `shops`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `shops`;
CREATE TABLE `shops` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255),
  `address` LONGTEXT,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `shops` (4 rows)
INSERT INTO `shops` (`id`, `name`, `address`, `created_at`) VALUES
('e4cb36f2-94fd-4a2f-81fa-15dd633d4d98', 'Mirpur Shop', NULL, '2026-06-27T03:54:02.2379+00:00'),
('6d4fa1d4-b16e-431c-8015-36d84526ad90', 'Uttara Shop', NULL, '2026-06-27T03:54:02.2379+00:00'),
('b11e0746-c49a-43a2-ae39-41f829846213', 'Dhanmondi', NULL, '2026-07-16T10:53:40.777109+00:00'),
('35babb6b-cdfb-4c61-840b-38810b5f3948', 'Banani Model Town', NULL, '2026-08-24T09:26:13.988327+00:00');

-- --------------------------------------------------------
-- Table structure for table `store_requisition_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `store_requisition_items`;
CREATE TABLE `store_requisition_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `requisition_id` VARCHAR(64),
  `barcode` VARCHAR(255),
  `product_code` VARCHAR(255),
  `product_name` VARCHAR(255),
  `uom` VARCHAR(255),
  `cpu` DECIMAL(15,2) DEFAULT 0.00,
  `mrp` DECIMAL(15,2) DEFAULT 0.00,
  `category` VARCHAR(255),
  `bal_qty` INT DEFAULT 0,
  `stock_in_cs` DECIMAL(15,2) DEFAULT 0.00,
  `req_qty` INT DEFAULT 0,
  `app_qty` INT DEFAULT 0,
  `cost_value` DECIMAL(15,2) DEFAULT 0.00,
  `avg_days_sale` DECIMAL(15,2) DEFAULT 0.00,
  `days_remain` DECIMAL(15,2) DEFAULT 0.00,
  `style` VARCHAR(255),
  `carton_size` DECIMAL(15,2) DEFAULT 0.00,
  `is_approved` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `store_requisition_items` (3 rows)
INSERT INTO `store_requisition_items` (`id`, `requisition_id`, `barcode`, `product_code`, `product_name`, `uom`, `cpu`, `mrp`, `category`, `bal_qty`, `stock_in_cs`, `req_qty`, `app_qty`, `cost_value`, `avg_days_sale`, `days_remain`, `style`, `carton_size`, `is_approved`, `created_at`) VALUES
('524b12c4-65f7-4fff-b222-1b49c09a8b47', 'c0381972-070a-4919-9881-333cc440d624', '1001100004', 'A000004', 'Baby Shoes (5458)', NULL, 450, 890, NULL, 18, 40, 1, 1, 450, 0, 0, NULL, 1, 1, '2026-08-11T10:25:37.036807+00:00'),
('277cb93b-60d8-4f83-a124-0e43a617270d', 'de6f0a8f-6ca8-4f73-9c57-e765126f1832', '1001100004', 'A000004', 'Baby Shoes (5458)', NULL, 450, 890, NULL, 16, 42, 4, 4, 1800, 0, 0, NULL, 1, 1, '2026-08-21T12:22:32.521704+00:00'),
('ffda5c82-ab81-46ed-9003-2406a8730eb5', 'de6f0a8f-6ca8-4f73-9c57-e765126f1832', '1001100005', 'A000005', 'Boys Shandal (4785)', NULL, 490, 990, NULL, 0, 12, 13, 13, 6370, 0, 0, NULL, 1, 1, '2026-08-21T12:22:32.521704+00:00');

-- --------------------------------------------------------
-- Table structure for table `store_requisitions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `store_requisitions`;
CREATE TABLE `store_requisitions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `requisition_no` VARCHAR(255),
  `shop_name` VARCHAR(255),
  `requisition_date` VARCHAR(64),
  `vendor` VARCHAR(255),
  `prepared_by` VARCHAR(255),
  `status` VARCHAR(255),
  `total_qty` INT DEFAULT 0,
  `total_value` DECIMAL(15,2) DEFAULT 0.00,
  `delivery_date` VARCHAR(64),
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `store_requisitions` (2 rows)
INSERT INTO `store_requisitions` (`id`, `requisition_no`, `shop_name`, `requisition_date`, `vendor`, `prepared_by`, `status`, `total_qty`, `total_value`, `delivery_date`, `created_at`, `updated_at`) VALUES
('c0381972-070a-4919-9881-333cc440d624', 'REQ20260811001', 'Banani Model Town', '2026-08-11T00:00:00+00:00', 'N/A', 'Super Admin', 'Pending', 1, 450, NULL, '2026-08-11T10:25:36.13+00:00', '2026-08-11T10:25:36.13+00:00'),
('de6f0a8f-6ca8-4f73-9c57-e765126f1832', 'REQ20260821001', 'Banani Model Town', '2026-08-21T00:00:00+00:00', 'N/A', 'Shakil Mahmud', 'Approved', 17, 8170, NULL, '2026-08-21T12:22:32.695+00:00', '2026-08-21T12:22:32.695+00:00');

-- --------------------------------------------------------
-- Table structure for table `store_stocks`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `store_stocks`;
CREATE TABLE `store_stocks` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `store_id` VARCHAR(64),
  `product_id` VARCHAR(64),
  `stock_qty` INT DEFAULT 0,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `store_stocks` (6 rows)
INSERT INTO `store_stocks` (`id`, `store_id`, `product_id`, `stock_qty`, `created_at`, `updated_at`) VALUES
('0cc6b793-7e13-44ab-9637-17becd1807b8', 'b11e0746-c49a-43a2-ae39-41f829846213', '7880bfd9-1128-46dd-b37f-df879d0df265', 5, '2026-07-16T09:30:05.936345+00:00', '2026-07-16T09:30:05.936345+00:00'),
('4b63ef48-91f4-456a-8eb8-cee96f2e8bab', 'b11e0746-c49a-43a2-ae39-41f829846213', '6496f0ee-f784-4228-90a5-831d89e7cdeb', 10, '2026-08-12T04:16:04.789112+00:00', '2026-08-12T04:16:04.789112+00:00'),
('2d80b84f-d7d4-49c2-a497-2a756fed54a1', '35babb6b-cdfb-4c61-840b-38810b5f3948', '19d8cc09-6a07-4b84-a6b7-20e450708ab2', 13, '2026-08-24T09:21:51.97148+00:00', '2026-08-24T09:21:51.97148+00:00'),
('e9f4af73-f111-4e05-881f-734a63d0fb16', '35babb6b-cdfb-4c61-840b-38810b5f3948', '7880bfd9-1128-46dd-b37f-df879d0df265', 0, '2026-07-18T05:23:21.414436+00:00', '2026-07-18T05:23:21.414436+00:00'),
('c79d5d34-f3b8-492b-b68a-0128685c1847', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'bd212d7c-abe6-4801-8365-81fcf94559c7', 16, '2026-07-15T11:04:36.327412+00:00', '2026-07-15T11:04:36.327412+00:00'),
('092c2374-9ad3-4cbd-bb8b-9f98d87c7bbf', '35babb6b-cdfb-4c61-840b-38810b5f3948', '9da46154-3ad7-4a33-9a33-80ddd24c5e25', 19, '2026-07-15T11:45:31.761947+00:00', '2026-07-15T11:45:31.761947+00:00');

-- --------------------------------------------------------
-- Table structure for table `stores`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `stores`;
CREATE TABLE `stores` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `area_id` VARCHAR(64),
  `name` VARCHAR(255),
  `address` LONGTEXT,
  `shop_type` VARCHAR(255),
  `postal_code` VARCHAR(255),
  `country` VARCHAR(255),
  `email` VARCHAR(255),
  `city` VARCHAR(255),
  `contact_no` VARCHAR(255),
  `date_of_enrollment` VARCHAR(255),
  `sale_on` VARCHAR(255),
  `vat_reg_no` VARCHAR(255),
  `dl_no` VARCHAR(255),
  `trade_lic_no` VARCHAR(255),
  `reference_store_code` VARCHAR(255),
  `latitude` VARCHAR(255),
  `longitude` VARCHAR(255),
  `sms_masking` VARCHAR(255),
  `web_sale` TINYINT(1) DEFAULT 1,
  `store_wise_sales_voucher` TINYINT(1) DEFAULT 1,
  `store_opening_time` VARCHAR(255),
  `store_closing_time` VARCHAR(255),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `stores` (4 rows)
INSERT INTO `stores` (`id`, `area_id`, `name`, `address`, `shop_type`, `postal_code`, `country`, `email`, `city`, `contact_no`, `date_of_enrollment`, `sale_on`, `vat_reg_no`, `dl_no`, `trade_lic_no`, `reference_store_code`, `latitude`, `longitude`, `sms_masking`, `web_sale`, `store_wise_sales_voucher`, `store_opening_time`, `store_closing_time`, `status`, `created_at`) VALUES
('b11e0746-c49a-43a2-ae39-41f829846213', '1fee0778-046a-4eca-bfd2-7fbaa2983c60', 'Dhanmondi', '', 'Store', '', 'Bangladesh', '', '', '', NULL, 'MRP', '', '', '', '', '', '', '', 0, 0, NULL, NULL, 'ACTIVE', '2026-07-11T05:08:20.967802+00:00'),
('81295227-f235-48d5-9e48-c069efab744b', 'd55bdb89-7557-4354-9e34-a39c63dd8840', 'Gulshan 1', '', 'Store', '', 'Bangladesh', '', '', '', NULL, 'MRP', '', '', '', '', '', '', '', 0, 0, NULL, NULL, 'ACTIVE', '2026-07-11T05:08:35.714625+00:00'),
('9704741f-28b3-4752-8d87-b0a89b0c4b40', 'b33c1a2f-8946-4cfd-96c0-2632c318f68d', 'Uttara JamJam Tower', '', 'Store', '', 'Bangladesh', '', '', '', NULL, 'MRP', '', '', '', '', '', '', '', 0, 0, NULL, NULL, 'ACTIVE', '2026-07-11T05:19:56.818218+00:00'),
('35babb6b-cdfb-4c61-840b-38810b5f3948', '645fa0f4-7c18-46e9-b0ad-25f8c90f60d7', 'Banani Model Town', 'Banani Model Town', 'Store', '1213', 'Bangladesh', '', 'Dhaka', '', '2024-01-01', 'MRP', 'Mushak-6.3', '', '', '', '', '', '', 0, 0, NULL, NULL, 'ACTIVE', '2026-07-11T05:07:45.376002+00:00');

-- --------------------------------------------------------
-- Table structure for table `sub_subcategories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sub_subcategories`;
CREATE TABLE `sub_subcategories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `category_name` VARCHAR(255),
  `subcategory_name` VARCHAR(255),
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` LONGTEXT,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `sub_subcategories` (9 rows)
INSERT INTO `sub_subcategories` (`id`, `category_name`, `subcategory_name`, `sl`, `code`, `name`, `description`, `created_at`) VALUES
('3eda8e39-7d10-4b72-8993-0fd1c8f13c34', 'Baby Feeding', 'Baby Feeder', 3, '002000003', 'Plastic Feeder', '', '2026-06-23T07:10:33.075443+00:00'),
('c6f664d8-f079-472e-94de-520af7587cf5', 'Baby Feeding', 'Baby Feeder', 4, '002000004', 'Glass Feeder', '', '2026-06-23T07:10:43.064496+00:00'),
('36de7101-7aa0-449d-b950-ab407a1eef77', 'Sandal & Shoes', 'Baby Shoe', 1, '002000001', 'Baby Shoe', '', '2026-06-23T07:07:51.022868+00:00'),
('394cc31f-ce99-4c4f-89f9-92646a3135f8', 'Sandal & Shoes', 'Shoes', 2, '002000002', 'Shoes', '', '2026-06-23T07:08:03.552026+00:00'),
('bde5035b-2357-4770-a26b-045fa0b2b45c', 'Baby Feeding', 'Nipple', 5, '002000005', 'Nipple', '', '2026-08-12T04:09:36.891482+00:00'),
('3c7748d0-ccc1-40a6-a78e-cb4b79f2c58a', 'Toys', 'Outdoor Game', 6, '002000006', 'Football', '', '2026-08-25T04:15:18.782857+00:00'),
('ef9b86fb-fdc0-43be-a5fa-f6a45366cced', 'Toys', 'Outdoor Game', 7, '002000007', 'Hot Wheel', '', '2026-08-25T04:15:19.329448+00:00'),
('5f17c16d-c5af-4819-b95e-44dfb01f06bb', 'Toys', 'Outdoor Game', 8, '002000008', 'Big Car', '', '2026-08-25T04:15:19.563396+00:00'),
('6cd45708-c641-4b84-857c-68440652ad77', 'Toys', 'Outdoor Game', 9, '002000009', 'Toy', '', '2026-08-25T04:15:20.113948+00:00');

-- --------------------------------------------------------
-- Table structure for table `subcategories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `subcategories`;
CREATE TABLE `subcategories` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `category_id` VARCHAR(64),
  `category_name` VARCHAR(255),
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `description` LONGTEXT,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `subcategories` (6 rows)
INSERT INTO `subcategories` (`id`, `category_id`, `category_name`, `sl`, `code`, `name`, `description`, `created_at`) VALUES
('08368a6e-00c2-4aed-ab25-611239e60acd', NULL, 'Baby Feeding', 3, '0020003', 'Baby Feeder', '', '2026-06-23T07:07:00.026127+00:00'),
('e2155f95-8aaa-4cf1-baf2-620058d3b2ba', NULL, 'Baby Feeding', 4, '0020004', 'Mum Pot', '', '2026-06-23T07:07:24.826474+00:00'),
('eb861962-ef00-4e50-a6d7-ee8acb9bf441', NULL, 'Sandal & Shoes', 1, '0020001', 'Shoes', '', '2026-06-23T07:04:52.074615+00:00'),
('60618841-eb3e-41e7-be96-b21aea6c3f67', NULL, 'Sandal & Shoes', 2, '0020002', 'Baby Shoe', '', '2026-06-23T07:06:24.659478+00:00'),
('b4a9a64b-9eb5-4e75-9d27-29a6d1e47bf8', NULL, 'Baby Feeding', 5, '0020005', 'Nipple', '', '2026-08-12T04:09:03.788039+00:00'),
('d84543ae-2f1e-43f7-953c-5b6e7ad7859c', NULL, 'Toys', 6, '0020006', 'Outdoor Game', '', '2026-08-25T04:15:18.486927+00:00');

-- --------------------------------------------------------
-- Table structure for table `terminals`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `terminals`;
CREATE TABLE `terminals` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `store_id` VARCHAR(64),
  `mac_address` LONGTEXT,
  `counter_id` VARCHAR(64),
  `status` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `terminals` (2 rows)
INSERT INTO `terminals` (`id`, `store_id`, `mac_address`, `counter_id`, `status`, `created_at`) VALUES
('04c1d0a4-ded6-4171-89f0-a034eec7d9a8', '35babb6b-cdfb-4c61-840b-38810b5f3948', 'B0:5C:DA:5B:B5:7E', '01', 'ACTIVE', '2026-07-12T07:15:32.090758+00:00'),
('62766bbc-8511-479c-a05c-fd4d3072ac10', 'b11e0746-c49a-43a2-ae39-41f829846213', 'B0:5C:DA:5B:B5:7F', '02', 'ACTIVE', '2026-07-12T07:16:50.618225+00:00');

-- --------------------------------------------------------
-- Table structure for table `user_menu_permissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_menu_permissions`;
CREATE TABLE `user_menu_permissions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(64),
  `permissions` LONGTEXT,
  `created_at` VARCHAR(64),
  `updated_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `user_menu_permissions` (1 rows)
INSERT INTO `user_menu_permissions` (`id`, `employee_id`, `permissions`, `created_at`, `updated_at`) VALUES
('0a5c1c43-05eb-46d5-bc71-7f1cbb4c8cb2', 'f38e83d8-d022-4ce6-be67-15d945803795', '{"group_CRM":true,"edit_Brand":true,"view_Brand":true,"edit_Vendor":true,"view_Vendor":true,"edit_Product":true,"edit_Reprint":true,"view_Product":true,"view_Reprint":true,"edit_Category":true,"view_Category":true,"edit_Promotion":true,"group_Approval":true,"group_Settings":true,"view_Dashboard":true,"view_Promotion":true,"group_Dashboard":true,"group_Inventory":true,"group_Promotion":true,"edit_Subcategory":true,"view_Subcategory":true,"edit_Price Change":true,"view_Price Change":true,"edit_Barcode Print":true,"edit_Customer Type":true,"view_Barcode Print":true,"view_Customer Type":true,"edit_Customer Entry":true,"edit_Measuring Unit":true,"edit_Store Delivery":true,"view_Customer Entry":true,"view_Measuring Unit":true,"view_Store Delivery":true,"edit_Customer Report":true,"edit_Damage and Lost":true,"edit_Purchase Return":true,"view_Customer Report":true,"view_Damage and Lost":true,"view_Purchase Return":true,"edit_Promotion Extend":true,"edit_Purchase Receive":true,"edit_Sub sub-category":true,"edit_VAT Policy Setup":true,"view_Promotion Extend":true,"view_Purchase Receive":true,"view_Sub sub-category":true,"view_VAT Policy Setup":true,"edit_Point Earn Policy":true,"edit_Receive From Shop":true,"view_Point Earn Policy":true,"view_Receive From Shop":true,"edit_Discount Reference":true,"edit_Promotion InActive":true,"view_Discount Reference":true,"view_Promotion InActive":true,"edit_Product Bulk Update":true,"view_Product Bulk Update":true,"edit_Price Change (Excel)":true,"edit_Product Quick Search":true,"edit_Requisition Approval":true,"view_Price Change (Excel)":true,"view_Product Quick Search":true,"view_Requisition Approval":true,"edit_Vendorwise Product List":true,"view_Vendorwise Product List":true,"edit_Purchase Order by Vendor":true,"view_Purchase Order by Vendor":true,"edit_Store Transfer Permission":true,"view_Store Transfer Permission":true,"edit_Purchase Receive by Vendor":true,"view_Purchase Receive by Vendor":true}', '2026-07-11T08:20:16.829929+00:00', '2026-07-11T08:52:28.319+00:00');

-- --------------------------------------------------------
-- Table structure for table `vat_policies`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `vat_policies`;
CREATE TABLE `vat_policies` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sl` INT DEFAULT 0,
  `sdc_vat_code` VARCHAR(255),
  `sdc_sd_code` VARCHAR(255),
  `vat_rate` DECIMAL(15,2) DEFAULT 0.00,
  `sd_rate` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `vat_policies` (1 rows)
INSERT INTO `vat_policies` (`id`, `sl`, `sdc_vat_code`, `sdc_sd_code`, `vat_rate`, `sd_rate`, `created_at`) VALUES
('f86433e6-c31b-4b4b-835c-1417de9bb110', 1, '10140445', '0000060462', 7.5, 0, '2026-06-23T07:24:22.956169+00:00');

-- --------------------------------------------------------
-- Table structure for table `vendors`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `vendors`;
CREATE TABLE `vendors` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sl` INT DEFAULT 0,
  `code` VARCHAR(255),
  `name` VARCHAR(255),
  `address` LONGTEXT,
  `postal_code` VARCHAR(255),
  `city` VARCHAR(255),
  `country` VARCHAR(255),
  `contact_no` VARCHAR(255),
  `email` VARCHAR(255),
  `website` VARCHAR(255),
  `store_can_receive` TINYINT(1) DEFAULT 1,
  `vendor_type` VARCHAR(255),
  `owner_partner` VARCHAR(255),
  `vat_registered` TINYINT(1) DEFAULT 1,
  `vat_registration_no` VARCHAR(255),
  `nid` VARCHAR(255),
  `tin` VARCHAR(255),
  `turnover_company` TINYINT(1) DEFAULT 1,
  `regular_contact` LONGTEXT,
  `management_contact` LONGTEXT,
  `marketing_contact` LONGTEXT,
  `financial_contact` LONGTEXT,
  `trading_info` LONGTEXT,
  `contract_details` LONGTEXT,
  `bank_info` LONGTEXT,
  `adjust_specify` LONGTEXT,
  `status` VARCHAR(255),
  `created_at` VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `vendors` (4 rows)
INSERT INTO `vendors` (`id`, `sl`, `code`, `name`, `address`, `postal_code`, `city`, `country`, `contact_no`, `email`, `website`, `store_can_receive`, `vendor_type`, `owner_partner`, `vat_registered`, `vat_registration_no`, `nid`, `tin`, `turnover_company`, `regular_contact`, `management_contact`, `marketing_contact`, `financial_contact`, `trading_info`, `contract_details`, `bank_info`, `adjust_specify`, `status`, `created_at`) VALUES
('ae6fc5fd-76f9-41a0-b271-3d7386d267f2', 1, '1001', 'Crystal Corporation', 'Dhaka', '', 'Dhaka', 'Bangladesh', '0123456789', '', '', 0, 'Local', 'Owner', 0, '', '', '', 0, '{"cell":"0","name":"a","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"city":"Dhaka","name":"Crystal Corporation","email":"","address":"Dhaka","country":"Bangladesh","website":"","contact_no":"0123456789","postal_code":"","same_as_reg":false,"member_director":"Member"}', '{"margin_rate":"","manage_stock":"Yes","delivery_days":"","payment_terms":"After Sale","transport_mode":"","gross_margin_on":"","supply_schedule":"","commission_percent":"","date_of_enrollment":"2026-06-23","special_discount_type":"","price_change_notice_days":"7","special_discount_percent":""}', '{"bank_name":"","routing_no":"","branch_name":"","account_name":"","account_number":""}', '{"damage":"","short_dated":"","slow_moving":"","expire_product":""}', 'ACTIVE', '2026-06-23T08:46:38.081331+00:00'),
('b1badfbd-4065-440a-b680-91ad1f02aacc', 2, '1002', 'Huate Kids Shoes', 'China', '', '', 'Bangladesh', '', '', '', 0, 'Import', 'Owner', 0, '', '', '', 0, '{"cell":"0","name":"a","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"city":"","name":"Huate Kids Shoes","email":"","address":"China","country":"Bangladesh","website":"","contact_no":"","postal_code":"","same_as_reg":false,"member_director":"Member"}', '{"margin_rate":"","manage_stock":"Yes","delivery_days":"","payment_terms":"Credit","transport_mode":"","gross_margin_on":"","supply_schedule":"","commission_percent":"","date_of_enrollment":"2026-06-23","special_discount_type":"","price_change_notice_days":"7","special_discount_percent":""}', '{"bank_name":"","routing_no":"","branch_name":"","account_name":"","account_number":""}', '{"damage":"","short_dated":"","slow_moving":"","expire_product":""}', 'ACTIVE', '2026-06-23T08:55:06.010114+00:00'),
('3075d49f-48c6-4be1-b3c8-8c4195e1a1f4', 3, '1003', 'EG', 'Dhaka', '', '', 'Bangladesh', '', '', '', 0, 'Import', 'Owner', 0, '', '', '', 0, '{"cell":"0","name":"a","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"city":"","name":"EG","email":"","address":"Dhaka","country":"Bangladesh","website":"","contact_no":"","postal_code":"","same_as_reg":false,"member_director":"Member"}', '{"margin_rate":"","manage_stock":"Yes","delivery_days":"","payment_terms":"Credit","transport_mode":"","gross_margin_on":"","supply_schedule":"","commission_percent":"","date_of_enrollment":"2026-06-23","special_discount_type":"","price_change_notice_days":"","special_discount_percent":""}', '{"bank_name":"","routing_no":"","branch_name":"","account_name":"","account_number":""}', '{"damage":"","short_dated":"","slow_moving":"","expire_product":""}', 'ACTIVE', '2026-06-23T11:07:49.865448+00:00'),
('046e9c89-71bd-4d3a-bdc7-5d03bdee5821', 4, '1004', 'Radiant', '', '', '', 'Bangladesh', '', '', '', 0, 'Local', 'Owner', 0, '', '', '', 0, '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"cell":"","name":"","email":"","designation":""}', '{"city":"","name":"Radiant","email":"","address":"","country":"Bangladesh","website":"","contact_no":"","postal_code":"","same_as_reg":false,"member_director":"Member"}', '{"margin_rate":"","manage_stock":"Yes","delivery_days":"","payment_terms":"","transport_mode":"","gross_margin_on":"","supply_schedule":"","commission_percent":"","date_of_enrollment":"2026-08-25","special_discount_type":"","price_change_notice_days":"","special_discount_percent":""}', '{"bank_name":"","routing_no":"","branch_name":"","account_name":"","account_number":""}', '{"damage":"","short_dated":"","slow_moving":"","expire_product":""}', 'ACTIVE', '2026-08-25T04:15:21.177662+00:00');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
