CREATE TABLE demo_user (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE template (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL,
  cover_url VARCHAR(255) NOT NULL,
  required_image_count INT NOT NULL,
  accepted_mime_types VARCHAR(255) NOT NULL,
  max_file_size_bytes BIGINT NOT NULL,
  sort_order INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO demo_user (id, display_name) VALUES ('demo-a', '演示用户 A'), ('demo-b', '演示用户 B');
INSERT INTO template (id, title, category, description, cover_url, required_image_count, accepted_mime_types, max_file_size_bytes, sort_order) VALUES
('postcard', '旅行明信片', '创意图片', '把两张旅行照片拼成一份值得收藏的明信片。', '/covers/postcard.svg', 2, 'image/jpeg,image/png', 5242880, 1),
('portrait', '光影人像', '创意图片', '用一张人像照片，留下柔和而有层次的光影。', '/covers/portrait.svg', 1, 'image/jpeg,image/png', 5242880, 2),
('collage', '生活拼贴', '生活记录', '将三张日常照片组合成一页轻盈的生活记录。', '/covers/collage.svg', 3, 'image/jpeg,image/png', 5242880, 3),
('journal', '周末日记', '生活记录', '用一张照片记录这个周末的小小发现。', '/covers/journal.svg', 1, 'image/jpeg,image/png', 5242880, 4);
