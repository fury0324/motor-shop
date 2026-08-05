-- Reference only — NOT executed against anything. This is the schema dump
-- of the original MySQL `motor_shop` database, kept here so the Module 9
-- data-migration script (MySQL -> Firestore) has exact column names/types/
-- constraints to map from, instead of relying on memory of the PHP queries.
--
-- phpMyAdmin SQL Dump, version 5.2.1, MariaDB 10.4.32, generated 2026-07-15.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `motor_shop`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `contact_number` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `home_address` text NOT NULL,
  `birth_date` date DEFAULT NULL,
  `civil_status` varchar(50) DEFAULT NULL,
  `occupation` varchar(255) DEFAULT NULL,
  `monthly_income` decimal(12,2) DEFAULT NULL,
  `valid_id_path` text DEFAULT NULL,
  `barangay_clearance_path` text DEFAULT NULL,
  `utility_receipt_path` text DEFAULT NULL,
  `proof_of_income_path` text DEFAULT NULL,
  `co_maker_name` varchar(255) DEFAULT NULL,
  `co_maker_contact` varchar(50) DEFAULT NULL,
  `co_maker_relationship` varchar(100) DEFAULT NULL,
  `co_maker_address` text DEFAULT NULL,
  `co_maker_id_path` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `added_by_name` varchar(100) DEFAULT NULL,
  `added_by_role` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installment_payments`
--

CREATE TABLE `installment_payments` (
  `id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `payment_no` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `status` enum('Pending','Paid','Partial','Overdue') DEFAULT 'Pending',
  `penalty_amount` decimal(12,2) DEFAULT 0.00,
  `payment_method` enum('Cash','Bank Transfer','GCash','Others') DEFAULT 'Cash',
  `reference_no` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `description` text DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) DEFAULT 'In Stock',
  `statusColor` varchar(20) DEFAULT 'green',
  `image` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `color` varchar(50) DEFAULT NULL,
  `is_part` tinyint(1) DEFAULT 0,
  `quantity` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_units`
--

CREATE TABLE `inventory_units` (
  `id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `engine_number` varchar(100) NOT NULL,
  `chassis_number` varchar(100) NOT NULL,
  `color` varchar(50) DEFAULT NULL,
  `unit_status` enum('Available','Reserved','Sold','In Transit') DEFAULT 'Available',
  `purchase_date` date DEFAULT NULL,
  `selling_price` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parts_transactions`
--

CREATE TABLE `parts_transactions` (
  `id` int(11) NOT NULL,
  `transaction_no` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `price` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `change_amount` decimal(10,2) DEFAULT 0.00,
  `payment_type` varchar(20) DEFAULT 'Cash',
  `transaction_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Completed',
  `processed_by_id` int(11) DEFAULT NULL,
  `processed_by_name` varchar(255) DEFAULT NULL,
  `processed_by_role` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `transaction_no` varchar(50) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `inventory_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `payment_type` enum('Cash','Installment') NOT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) DEFAULT 0.00,
  `down_payment` decimal(12,2) DEFAULT 0.00,
  `terms` int(11) DEFAULT NULL,
  `monthly_amount` decimal(12,2) DEFAULT NULL,
  `balance` decimal(12,2) DEFAULT 0.00,
  `transaction_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Completed','Pending','Cancelled') DEFAULT 'Completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `remaining_balance` decimal(12,2) DEFAULT 0.00,
  `last_payment_date` date DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `processed_by_id` int(11) DEFAULT NULL,
  `processed_by_name` varchar(100) DEFAULT NULL,
  `processed_by_role` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','staff','cashier') DEFAULT 'staff',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

ALTER TABLE `installment_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transaction_id` (`transaction_id`);

ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `inventory_units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `engine_number` (`engine_number`),
  ADD UNIQUE KEY `chassis_number` (`chassis_number`),
  ADD KEY `inventory_id` (`inventory_id`);

ALTER TABLE `parts_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_no` (`transaction_no`),
  ADD KEY `idx_parts_transactions_transaction_no` (`transaction_no`),
  ADD KEY `idx_parts_transactions_customer_name` (`customer_name`),
  ADD KEY `idx_parts_transactions_inventory_id` (`inventory_id`),
  ADD KEY `idx_parts_transactions_transaction_date` (`transaction_date`),
  ADD KEY `idx_parts_transactions_status` (`status`),
  ADD KEY `idx_parts_transactions_created_at` (`created_at`);

ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_otp` (`otp`);

ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_no` (`transaction_no`),
  ADD KEY `inventory_id` (`inventory_id`),
  ADD KEY `idx_transaction_no` (`transaction_no`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_unit_id` (`unit_id`),
  ADD KEY `idx_processed_by` (`processed_by_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

ALTER TABLE `customers` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `installment_payments` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `inventory` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `inventory_units` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `parts_transactions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `password_resets` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `transactions` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `users` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

ALTER TABLE `installment_payments`
  ADD CONSTRAINT `installment_payments_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

ALTER TABLE `inventory_units`
  ADD CONSTRAINT `inventory_units_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE;

ALTER TABLE `parts_transactions`
  ADD CONSTRAINT `parts_transactions_ibfk_1` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`);

ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`),
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `inventory_units` (`id`);
COMMIT;
