# 素材制作网站

当前处于阶段 0：已建立工程骨架，模板、用户、上传、异步任务和历史记录尚未实现。具体需求与开发阶段分别见 [项目规格](docs/SPEC.md) 和 [开发计划](docs/PLAN.md)。

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

## 实施与验证状态

- 阶段 0：已建立工程配置和基础健康接口。2026-11-01 已使用 Docker Compose 构建并启动三个服务：页面及同源健康接口返回 200；MySQL 健康，Flyway 初始迁移成功；重启 MySQL 与后端后迁移记录和素材卷标记仍在，测试标记已清理。
- 同日容器构建通过 `npm ci`、前端生产构建和 Java 21 的测试/打包；在前端构建镜像中另行运行 lint、类型检查及测试，3 项测试通过。GitHub Actions 配置已提供，但尚未在 GitHub 上触发验证。
- Flyway 初始迁移仅验证迁移链，业务表和初始化数据将在后续阶段添加。
- 前端当前仅为基础占位页；代理单元测试覆盖 multipart、用户请求头、图片响应和上游不可用，真实上传及图片业务接口将在阶段 2 实现后进一步验证。
- 当前尚未实现用户身份、素材上传、任务执行或历史记录。
- 使用了 AI 辅助拆解任务与编写代码；实际验证和修正记录随开发进展补充。
