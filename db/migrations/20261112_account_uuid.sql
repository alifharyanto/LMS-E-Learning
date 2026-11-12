ALTER TABLE users
  ADD COLUMN account_uuid CHAR(36) NULL AFTER id;

UPDATE users
SET account_uuid = UUID()
WHERE account_uuid IS NULL;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_account_uuid (account_uuid);
