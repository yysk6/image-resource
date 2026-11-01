# 阶段 0：工程与交付骨架

状态：已实施，远程 CI 运行及真实上传代理联调待后续验证。依赖：[项目规格](../SPEC.md) 和 [总计划](../PLAN.md)。目标是建立可持续迭代、可在容器中运行的工程；此阶段不实现业务闭环。

## 输入与产物

- 输入：原题、总体规格；开发前检查工作区已有文件，保留已有内容。
- 产物：`frontend/`、`backend/`、`compose.yaml`、数据库持久卷、文件持久卷、`.env.example`、CI、根目录 README 和忽略规则。
- 技能：代码实现使用 `karpathy-guidelines`；建立界面视觉时按需使用 `frontend-design`。

## 实施步骤

1. 创建 Next.js App Router、React、TypeScript 前端，安装并固定 Tailwind、TanStack Query、ESLint、Vitest 和 Testing Library 的兼容版本；提交 `package-lock.json`。在 `package.json` 定义 `dev`、`build`、`start`、`lint`、`typecheck`、`test` 脚本。类型检查使用 `tsc --noEmit`；测试应在 CI 中非交互运行。
2. 创建 Java 21、Spring Boot 3.5.x、MyBatis Starter 3.0.x、Maven 后端；配置 Web、Validation、MySQL 驱动、Flyway、测试依赖。固定经过实际构建验证的具体版本，使用 Maven Wrapper 或在容器和 README 明确 Maven 版本。提供不依赖业务数据的健康接口 `GET /api/health`，不要暴露数据库凭据。
3. 创建 `frontend/Dockerfile`、`backend/Dockerfile`、`compose.yaml`。前端和后端各自构建并监听容器内地址；MySQL 使用独立数据卷，后端素材目录使用独立数据卷；通过环境变量注入连接参数。为 MySQL 配置健康检查，并在后端依赖健康状态后启动。明确容器端口映射。
4. 确定浏览器到 Java 的访问路径：推荐 Next.js 的同源 `/api` 反向代理到 Compose 内的 `backend` 服务；本地非 Compose 模式通过环境变量指定后端地址。验证代理支持 multipart 上传、演示用户请求头及图片响应；不要把仅供容器互访的 `backend` 主机名暴露给浏览器。
5. 添加 Flyway 迁移目录及初始迁移，验证启动连接和迁移执行；后续阶段以新版本脚本新增表。使用 `utf8mb4`，数据库设置及时间处理与规格一致。初始化不删除已有数据。
6. 建立 GitHub Actions：push 与 pull request 分别运行前端 lint、类型检查、测试和构建，以及后端测试和构建；缓存依赖可选，但不得代替锁版本或构建。若测试需要 MySQL，定义 CI 服务容器或明确容器化集成测试方式。
7. README 写出已实现内容、先决条件、环境变量、启动、停止、测试、端口及限制；`.env.example` 只包含演示值。忽略本地凭据、依赖、构建产物和运行文件。

## 验证

以下为实现后应具备的命令，具体脚本名称须与项目实际保持一致；在容器内运行检查，不能将尚不存在的命令标记为已通过。

```sh
docker compose config
docker compose up --build -d
docker compose ps
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
docker compose exec frontend npm test -- --run
docker compose exec frontend npm run build
docker compose exec backend ./mvnw test
docker compose exec backend ./mvnw package
```

生产运行镜像如果不包含 npm 开发依赖或 Maven，上述检查应改为通过专门的构建/测试镜像运行；README 必须给出实际可用的等价容器命令。访问前端和健康接口；重启容器核对卷中测试数据仍在；检查全新数据库迁移成功且重复启动不清空数据。

## 退出条件

- [x] 前后端、MySQL 可在新建 Compose 卷上启动，健康接口的代理路径、容器网络和数据库连接已验证。
- [x] 重启后数据库迁移记录和素材卷测试标记保留；健康检查、迁移生效，配置样例不含真实凭据。
- [x] CI 包含规定检查；前端 lint、类型检查、3 项测试和构建在容器通过，后端测试及打包在 Java 21 容器通过。GitHub Actions 尚未远程触发。
- [x] README、依赖锁文件和版本说明与实现一致。

2026-11-01 验证：`docker compose config`、`docker compose up --build -d`；页面和 `/api/health` 返回 200；MySQL 与后端重启后 Flyway 显示版本 1、无需再次迁移，素材卷标记仍可读取。前端构建镜像中运行 `npm run lint`、`npm run typecheck`、`npm test`，通过 3 项测试；容器构建运行 `npm ci`、前端构建、Java 测试和打包。multipart、用户请求头与图片响应由代理单元测试覆盖，真实业务上传接口尚未实现；GitHub Actions 尚未远程运行。
