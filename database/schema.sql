-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `ai_createathon` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ai_createathon`;

-- Table for admin accounts
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'normal' NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table for project groups/teams
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL,
  `description` TEXT,
  `logo_path` VARCHAR(255) DEFAULT '/uploads/default-group.png',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table for participants (assigned to groups)
CREATE TABLE IF NOT EXISTS `participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(100) UNIQUE NOT NULL,
  `avatar_path` VARCHAR(255) DEFAULT '/uploads/default-avatar.png',
  `group_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_participants_group_name` (`group_id`, `name`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Table for live update posts during the event
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `image_path` VARCHAR(255) DEFAULT NULL,
  `admin_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_posts_created_at` (`created_at`),
  KEY `idx_posts_admin_created` (`admin_id`, `created_at`),
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Table for live public votes (one vote per IP address to ensure fairness)
CREATE TABLE IF NOT EXISTS `live_votes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NOT NULL,
  `voter_ip` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `voter_unique_ip` (`voter_ip`), -- Enforces 1 vote total per visitor IP
  KEY `idx_live_votes_group` (`group_id`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table for judges scores
CREATE TABLE IF NOT EXISTS `judge_scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NOT NULL,
  `judge_name` VARCHAR(100) NOT NULL,
  `score_creativity_innovation` INT DEFAULT 0,
  `score_effective_ai` INT DEFAULT 0,
  `score_technical_quality` INT DEFAULT 0,
  `score_presentation` INT DEFAULT 0,
  `score_practicality_impact` INT DEFAULT 0,
  `feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `judge_unique_group` (`judge_name`, `group_id`), -- One score per judge per group
  KEY `idx_judge_scores_group` (`group_id`),
  KEY `idx_judge_scores_created_at` (`created_at`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table for app configuration settings (e.g. toggle voting)
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(50) PRIMARY KEY,
  `value_name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- Table for express-session MySQL storage
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`),
  KEY `idx_sessions_expires` (`expires`)
) ENGINE=InnoDB;

-- Seed default settings
INSERT INTO `settings` (`key_name`, `value_name`) VALUES 
('voting_active', 'false')
ON DUPLICATE KEY UPDATE `value_name` = `value_name`;

-- Seed default admin account
-- Username: admin
-- Email: admin@admin.com
-- Password: 1234567890 (bcrypt hash generated with 10 salt rounds)
INSERT INTO `admins` (`id`, `username`, `email`, `password_hash`, `role`) VALUES 
(1, 'admin', 'admin@admin.com', '$2b$10$/cCiMjMpH/m5fAr/bbocoOEJwDFQdJ27/EfesMUb5IcjTTO9neXhe', 'super')
ON DUPLICATE KEY UPDATE
  `username` = VALUES(`username`),
  `email` = VALUES(`email`),
  `password_hash` = VALUES(`password_hash`),
  `role` = VALUES(`role`);
