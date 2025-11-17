
-- Manual MySQL Setup Script
-- Run this in MySQL Workbench or command line

-- Create database
CREATE DATABASE IF NOT EXISTS conversation_dev 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create user  
CREATE USER IF NOT EXISTS 'pulse_user'@'localhost' IDENTIFIED BY 'pulse_password';
CREATE USER IF NOT EXISTS 'pulse_user'@'%' IDENTIFIED BY 'pulse_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON conversation_dev.* TO 'pulse_user'@'localhost';
GRANT ALL PRIVILEGES ON conversation_dev.* TO 'pulse_user'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE conversation_dev;

-- Show success message
SELECT 'Database setup completed successfully!' as Status;
