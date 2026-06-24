ALTER TABLE `admins`
  ADD COLUMN `role` VARCHAR(20) DEFAULT 'normal' NOT NULL;

UPDATE `admins`
SET `role` = 'super'
WHERE `username` = 'admin';
