CREATE TABLE creation_task (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  template_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  current_stage VARCHAR(32) NULL,
  result_url VARCHAR(255) NULL,
  failure_reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES demo_user(id),
  CONSTRAINT fk_task_template FOREIGN KEY (template_id) REFERENCES template(id),
  INDEX idx_task_user_created (user_id, created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE task_asset (
  task_id VARCHAR(36) NOT NULL,
  asset_id VARCHAR(36) NOT NULL,
  position INT NOT NULL,
  PRIMARY KEY (task_id, position),
  UNIQUE KEY uq_task_asset (task_id, asset_id),
  CONSTRAINT fk_task_asset_task FOREIGN KEY (task_id) REFERENCES creation_task(id),
  CONSTRAINT fk_task_asset_asset FOREIGN KEY (asset_id) REFERENCES asset(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
