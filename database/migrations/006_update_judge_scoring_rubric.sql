SET @has_creativity := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_creativity_innovation'
);

SET @sql := IF(
  @has_creativity = 0,
  'ALTER TABLE `judge_scores` ADD COLUMN `score_creativity_innovation` INT DEFAULT 0 AFTER `judge_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_effective_ai := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_effective_ai'
);

SET @sql := IF(
  @has_effective_ai = 0,
  'ALTER TABLE `judge_scores` ADD COLUMN `score_effective_ai` INT DEFAULT 0 AFTER `score_creativity_innovation`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_technical := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_technical_quality'
);

SET @sql := IF(
  @has_technical = 0,
  'ALTER TABLE `judge_scores` ADD COLUMN `score_technical_quality` INT DEFAULT 0 AFTER `score_effective_ai`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_presentation := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_presentation'
);

SET @sql := IF(
  @has_presentation = 0,
  'ALTER TABLE `judge_scores` ADD COLUMN `score_presentation` INT DEFAULT 0 AFTER `score_technical_quality`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_practicality := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_practicality_impact'
);

SET @sql := IF(
  @has_practicality = 0,
  'ALTER TABLE `judge_scores` ADD COLUMN `score_practicality_impact` INT DEFAULT 0 AFTER `score_presentation`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_old_innovation := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'judge_scores'
    AND column_name = 'score_innovation'
);

SET @sql := IF(
  @has_old_innovation = 1,
  'UPDATE `judge_scores`
   SET
     `score_creativity_innovation` = ROUND(`score_innovation` * 3),
     `score_effective_ai` = ROUND(`score_design` * 2.5),
     `score_technical_quality` = ROUND(`score_execution` * 2),
     `score_presentation` = 0,
     `score_practicality_impact` = 0
   WHERE `score_creativity_innovation` = 0
     AND `score_effective_ai` = 0
     AND `score_technical_quality` = 0
     AND `score_presentation` = 0
     AND `score_practicality_impact` = 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
