CREATE TABLE asset (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(100) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_user FOREIGN KEY (user_id) REFERENCES demo_user(id),
  INDEX idx_asset_user (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
