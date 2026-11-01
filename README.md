# 素材制作网站

当前已实现阶段 2：支持演示用户切换、模板浏览和图片上传。异步任务与历史记录将在后续阶段实现。具体需求与开发阶段分别见 [项目规格](docs/SPEC.md) 和 [开发计划](docs/PLAN.md)。

## 技术与目录

- 前端：Next.js 15.5.28、React 19.1.2、TypeScript 5.9.3、Tailwind CSS 4.1.18、TanStack Query 5.90.12；Node.js 22.14.0。
- 后端：Java 21、Spring Boot 3.5.7、MyBatis Starter 3.0.5、Maven 3.9.9、Flyway、MySQL 8.0。
- `frontend/`：Next.js 页面、同源 API 转发与前端测试；`backend/`：Java 服务、迁移和后端测试；`docs/`：规格及各阶段计划；`.github/workflows/`：CI。

## 配置与启动

需要 Docker 和 Docker Compose，可选复制 `.env.example` 为 `.env` 并调整演示数据库配置。样例密码仅供本地演示。确保 3000、8080 端口可用。在项目目录执行：

```sh
docker compose up --build
```

访问 `http://localhost:3000`；`http://localhost:3000/api/health` 经前端服务端代理到 Java 健康接口，预期返回 `{"status":"ok"}`；也可直接访问 `http://localhost:8080/api/health`。MySQL 不对宿主机发布端口。Compose 中通过 MySQL 健康检查控制后端启动顺序；前端代理的 `BACKEND_URL` 只在服务器侧使用。

停止服务使用 `docker compose down`，默认保留数据库卷和素材卷；请在确认数据备份和影响后再清理卷。修改 MySQL 用户、密码或数据库名时，已有数据库卷不会重新执行 MySQL 初始化，需按 MySQL 的管理方式调整已有数据库。

变量：`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD` 控制数据库；Java 的 `SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`SPRING_DATASOURCE_PASSWORD` 和 `APP_STORAGE_PATH` 在 Compose 中设置；前端 `BACKEND_URL` 指向服务端可访问的 Java 地址。

## 测试与构建

CI 在 push 和 pull request 执行以下检查；需要 Node.js 22.14.0、JDK 21 和 Maven 3.9.9。部署验收应在隔离容器中执行，生产运行镜像不包含后端构建工具，可使用 Maven 构建镜像运行后端检查。

```sh
# frontend 目录
npm ci
npm run lint
npm run typecheck
npm test
npm run build

# backend 目录
mvn -B test
mvn -B package
```

在项目根目录的 POSIX shell 可使用下列构建容器运行检查；PowerShell 中将 `${PWD}` 改为 `$($PWD.Path)`：

```sh
docker run --rm -v "${PWD}/frontend:/app" -w /app node:22.14.0-bookworm-slim sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"
docker run --rm -v "${PWD}/backend:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn -B verify
```

这些命令会在挂载的项目目录生成依赖和构建文件；前端使用 `npm ci` 和锁文件。路径含空格时保留引号。

## 模板与演示用户

Flyway V2 初始化两个演示用户和四个模板，包含两个分类、单图及多图要求。四张 SVG 封面由本项目原创绘制，保存在 `frontend/public/covers/`，可离线访问。首页可筛选分类并进入详情查看素材规则。

用户选择保存在浏览器本地，相关请求使用 `X-Demo-User`；后端在个人业务接口检查用户是否存在。可通过右上角切换演示用户 A、B，并通过 `GET /api/me` 验证当前身份。这个请求头可以伪造，只用于演示，不是真实认证，不能用于生产安全隔离。个人任务功能尚未实现。

已实现接口：`GET /api/users` 返回用户数组；`GET /api/categories` 返回分类字符串数组；`GET /api/templates?category=生活记录` 返回模板数组；`GET /api/templates/{id}` 返回详情，不存在时返回 404；`GET /api/me` 需携带有效 `X-Demo-User`，无效时返回 401。模板包含 `id`、`title`、`category`、`description`、`coverUrl`、`requiredImageCount`、`acceptedMimeTypes` 和 `maxFileSizeBytes`；错误体包含 `code` 和 `message`。

`POST /api/assets` 接收 multipart 字段 `file` 和 `X-Demo-User`，成功返回 201 及 `id`、`mimeType`、`sizeBytes`、`previewUrl`；支持 JPEG 和 PNG，单张不超过 5 MiB。服务端检查声明格式和可解码内容，限制图像像素数，文件存储于 `APP_STORAGE_PATH`。`GET /api/assets/{id}/content` 需要相同用户头，不存在或不属于当前用户时返回 404。详情页支持预览、替换、移除和重试；阶段 2 不提交制作任务，刷新后上传位不会恢复，已上传文件仍可通过素材 ID 读取。替换、移除或页面关闭后的未引用素材不会自动清理。

真实数据库与文件集成测试针对独立测试环境运行，会写入演示素材且不自动清理。在 Compose 已启动、默认网络名称为 `work_default` 时，可执行 `docker run --rm --network work_default -v "${PWD}/tests:/tests:ro" node:22.14.0-bookworm-slim node /tests/asset-integration.mjs`；PowerShell 把 `${PWD}` 改为 `$($PWD.Path)`，Compose 项目名称不同时调整网络名称。

写入故障验证使用 `tests/fault-compose.yaml` 创建名为 `assetfault` 的隔离项目，MySQL 与测试图片存储使用临时文件系统。先确保该项目名未被其他工作使用并已构建 `work-backend`：

```sh
docker compose -p assetfault -f tests/fault-compose.yaml up -d
# 等两个后端完成启动和 Flyway 迁移后，只在隔离数据库中改为只读
docker compose -p assetfault -f tests/fault-compose.yaml exec -T db mysql -uroot -ptest_root_password -e "REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'test_user'@'%'; GRANT SELECT ON material_studio.* TO 'test_user'@'%';"
docker compose -p assetfault -f tests/fault-compose.yaml restart db-fault
# 等 db-fault 重启完成后执行；测试仅向隔离环境写入
docker run --rm --network assetfault_default -v "${PWD}/tests:/tests:ro" node:22.14.0-bookworm-slim node /tests/fault-integration.mjs
docker compose -p assetfault -f tests/fault-compose.yaml exec -T db-fault sh -c 'find /app/test-data -type f'
docker compose -p assetfault -f tests/fault-compose.yaml down
```

`find` 应无输出，表示数据库拒绝写入后没有留下临时图片；PowerShell 将 `${PWD}` 替换为 `$($PWD.Path)`。

## 实施与验证状态

- 阶段 0：已建立工程配置和基础健康接口。2026-11-01 已使用 Docker Compose 构建并启动三个服务：页面及同源健康接口返回 200；MySQL 健康，Flyway 初始迁移成功；重启 MySQL 与后端后迁移记录和素材卷标记仍在，测试标记已清理。
- 阶段 0 的容器检查及 GitHub Actions 已通过。
- 阶段 1 的容器构建、后端测试、前端 lint、类型检查及测试通过；真实 MySQL 的迁移、用户、分类、模板、详情、身份和本地封面接口已验证。桌面与 500 像素宽屏幕已通过截图检查；由于浏览器控制工具初始化失败，完整键盘交互尚未手动验证。lint 有 4 条本地 SVG 使用 `img` 的性能提示，不影响通过。
- 阶段 2 真实容器集成测试已验证 JPEG、PNG、无效图片、伪造类型、空文件、超大文件、用户隔离及后端重启后图片读取；独立环境的文件写入与数据库写入失败测试均返回预期错误，数据库写入失败后未留下临时文件。最终前端容器中 lint、类型检查及 13 项测试通过；lint 包含 5 条图片标签性能提示。
- 任务提交、任务执行及历史记录尚未实现。`X-Demo-User` 可伪造，不能当作生产环境的认证机制。
- 使用了 AI 辅助拆解任务与编写代码；实际验证和修正记录随开发进展补充。
