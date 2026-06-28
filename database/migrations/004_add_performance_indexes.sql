SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'participants'
    AND index_name = 'idx_participants_group_name'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `participants` ADD INDEX `idx_participants_group_name` (`group_id`, `name`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'posts'
    AND index_name = 'idx_posts_created_at'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `posts` ADD INDEX `idx_posts_created_at` (`created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'posts'
    AND index_name = 'idx_posts_admin_created'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `posts` ADD INDEX `idx_posts_admin_created` (`admin_id`, `created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'live_votes'
    AND index_name = 'idx_live_votes_group'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `live_votes` ADD INDEX `idx_live_votes_group` (`group_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND index_name = 'idx_judge_scores_group'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `judge_scores` ADD INDEX `idx_judge_scores_group` (`group_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND index_name = 'idx_judge_scores_created_at'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `judge_scores` ADD INDEX `idx_judge_scores_created_at` (`created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'sessions'
    AND index_name = 'idx_sessions_expires'
);
SET @sql = IF(@index_exists = 0, 'ALTER TABLE `sessions` ADD INDEX `idx_sessions_expires` (`expires`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
