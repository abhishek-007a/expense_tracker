-- 1. Create the database
CREATE DATABASE IF NOT EXISTS expense_tracker;
USE expense_tracker;

-- 2. Create the 'users' table
-- We will store hashed passwords, not plain text.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the 'categories' table
-- It's linked to a user via user_id.
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create the 'goals' table
CREATE TABLE IF NOT EXISTS goals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    monthly_contribution DECIMAL(10, 2) NOT NULL,
    target_date DATE NOT NULL,
    -- 'saved' amount will be calculated, so we don't store it here.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create the 'transactions' table
-- This links to both users and categories.
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id BIGINT NOT NULL,
    goal_id BIGINT NULL, -- Can be null
    type VnameemailARCHAR(10) NOT NULL, -- 'income' or 'expense'categoriesidid
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);categories

-- Insert default categories for a new user (the backend will do this on registration)
-- We can't do it here as we don't have a user_id yet.