ALTER TABLE `admins`
  ADD COLUMN `email` VARCHAR(100) UNIQUE NULL AFTER `username`;

UPDATE `admins`
SET
  `username` = 'admin',
  `email` = 'admin@admin.com',
  `password_hash` = '$2b$10$/cCiMjMpH/m5fAr/bbocoOEJwDFQdJ27/EfesMUb5IcjTTO9neXhe'
WHERE `id` = 1;

INSERT INTO `admins` (`id`, `username`, `email`, `password_hash`)
SELECT 1, 'admin', 'admin@admin.com', '$2b$10$/cCiMjMpH/m5fAr/bbocoOEJwDFQdJ27/EfesMUb5IcjTTO9neXhe'
WHERE NOT EXISTS (
  SELECT 1 FROM `admins` WHERE `id` = 1
);

ALTER TABLE `admins`
  MODIFY COLUMN `email` VARCHAR(100) NOT NULL;
