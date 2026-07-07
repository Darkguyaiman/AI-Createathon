SET @has_email := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'participants'
    AND column_name = 'email'
);

SET @has_student_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'participants'
    AND column_name = 'student_id'
);

SET @sql := IF(
  @has_email = 1 AND @has_student_id = 0,
  'ALTER TABLE `participants` CHANGE COLUMN `email` `student_id` VARCHAR(100) UNIQUE NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_email = 0 AND @has_student_id = 0,
  'ALTER TABLE `participants` ADD COLUMN `student_id` VARCHAR(100) UNIQUE NOT NULL AFTER `name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
