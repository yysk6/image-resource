# 阶段 5：测试、容器验收与交付

状态：验收、文档整理及双轴代码审查完成。前置条件：阶段 0–4 的功能及阶段验证完成，或明确记录尚未完成的项目。以 [总计划验收矩阵](../PLAN.md) 和 [规格第 7 节](../SPEC.md) 为依据。

## 1. 测试与质量检查

1. 对照总计划 A01–A09 补齐测试，逐项记录测试文件、命令和结果；特别检查三个失败阶段、入队拒绝、终态、用户隔离、多任务、查询异常、轮询清理。
2. 在隔离容器中运行前端 lint、TypeScript 检查、测试和构建，以及 Java 测试和构建。验证 GitHub Actions 在 push/PR 配置对应命令；CI 配置存在不等于实际运行通过。
3. 对真实 MySQL、文件卷、代理上传和数据库迁移执行容器集成验证；检查前端到后端的实际 URL、请求头、multipart 和图片展示。
4. 测试桌面与小屏主要流程，键盘焦点、按钮语义、上传标签，以及加载、空、失败与恢复提示。检查结果图和封面在交付环境可访问。

## 2. Compose 从零验收

1. 在独立的干净测试环境执行 `docker compose config` 和 `docker compose up --build`；记录启动所需配置、时间、端口和健康状态。避免删除已有用户数据；若需清空数据库，仅针对明确新建的测试项目及测试卷操作。
2. 按总计划手工流程验证模板、上传、任务成功、各阶段失败、多个任务、刷新、查询失败与恢复、用户隔离。
3. 常规重启容器后确认已完成任务、数据库和文件仍在；区分重启后历史持久化与未完成任务自动恢复。后者本题未实现时如实说明。
4. 记录实际执行命令、日期、结果和失败日志摘要；构建或网络受限时标为未验证并说明原因，不虚报通过。

## 3. README 与接口说明

README 至少包含：

- 项目目标、完成和未完成清单、已知限制、实际投入时间。
- Java、Spring Boot、MyBatis、MySQL、Next.js、React、Node、构建工具及关键依赖的真实版本；目录结构和职责。
- Docker 先决条件、端口、环境变量与无真实凭据示例、构建、启动、停止、数据卷、初始化与测试命令；命令与实际脚本一致。
- 用户切换及演示身份可伪造的限制；上传素材、示例素材及结果文件的来源、准备和访问方式。
- 每个主要接口、请求头、输入输出、常见错误码；状态、阶段、线程池、持久化与轮询策略。
- 按步骤演示成功、三个指定失败阶段、修改延迟、多个任务、刷新恢复和查询异常恢复；说明修改配置后如何使其生效。
- 队列饱和、进程崩溃/重启、未引用素材、重复提交、模拟身份等实际限制，以及可执行的人工排查步骤。
- AI 是否使用；若使用，如实写任务拆解、上下文、生成/修改、验证与修正的具体工作流；脚手架、开源代码和资源的来源与主要复用范围。

## 4. 部署和回滚说明

说明如何保存当前镜像版本及数据库/文件卷备份，使用目标版本镜像启动并检查健康、模板与任务；回滚时恢复上一个镜像，并依据迁移的兼容性决定是否恢复备份。数据库迁移可能不可逆，不能声称单纯回滚镜像必然回滚数据。测试恢复流程时使用独立副本，不覆盖用户现有数据。

## 5. 最终交付检查

- [x] 前后端源码、依赖版本/锁文件、数据库迁移与初始化数据齐全。
- [x] Dockerfile、Compose、非敏感配置、CI 和本地可用示例素材齐全。
- [x] A01–A09 与手工验收有实际证据；失败及未验证项明确记录。
- [x] README 的版本、命令、接口、演示步骤、限制和实际状态一致。
- [x] 源码交付注明验收代码基线；本次不提供压缩包。
- [x] 记录完成内容、实际检查结果、未完成项与已知风险。

## 6. 2026-11-01 验收记录

应用代码验收基线：`264e1ae`。在 Docker Compose v5.1.0 中使用新项目 `stage5accept` 及独立的 MySQL/素材卷；宿主机端口 13000、18080，MySQL 不暴露端口。以下命令从仓库根目录运行；PowerShell 的挂载路径请改用 `$($PWD.Path)`。覆盖文件使用 `!override`，需要 Compose 2.24.4 或更高版本。

```sh
docker compose -p stage5accept -f compose.yaml -f tests/acceptance-compose.yaml config --quiet
docker compose -p stage5accept -f compose.yaml -f tests/acceptance-compose.yaml up --build -d
docker run --rm --network stage5accept_default -v "$PWD/tests:/tests:ro" node:22.14.0-bookworm-slim sh -c 'node /tests/asset-integration.mjs && node /tests/task-integration.mjs && node /tests/history-integration.mjs'
docker build --target build -t stage5-frontend-check ./frontend
docker run --rm stage5-frontend-check sh -c 'npm run lint && npm run typecheck && npm test'
docker build --no-cache --target build -t stage5-backend-check ./backend
```

结果：Compose 配置和干净数据库初始化成功，前端构建、lint、类型检查和 22 项测试通过；lint 有 7 条图片标签性能提示。素材、成功任务和历史接口测试通过；重启隔离 MySQL、前端和后端后，已完成任务与上传图片仍可读取且图片内容一致。Java 无缓存构建及 5 项测试通过，首次下载依赖并构建约 3 分 31 秒。三个阶段失败、队列饱和、素材规则与数据库写入故障在独立 `stage5fault` 临时数据库中执行，全部通过；该环境的完整命令模式见 [CI integration job](../../.github/workflows/ci.yml)。

| 验收项 | 实际证据 |
| --- | --- |
| A01 | `tests/task-integration.mjs` 观察三个阶段按序进入并成功。 |
| A02 | `tests/task-scenarios.mjs` 分别观察三个阶段失败及后续阶段不执行。 |
| A03 | `tests/task-integration.mjs` 验证结果可访问及后续查询仍为成功；失败终态由 `tests/task-scenarios.mjs` 验证。 |
| A04 | `tests/asset-integration.mjs`、`tests/task-integration.mjs`、`tests/history-integration.mjs` 验证素材、任务、历史的用户隔离及输入校验。 |
| A05 | `tests/task-scenarios.mjs` 验证队列满时 503 及持久化失败状态；`tests/task-rejection-write-failure.mjs` 检验失败状态写入异常。 |
| A06 | `frontend/src/components/task-history.test.tsx` 验证两项任务交错返回时结果不串扰。 |
| A07 | `frontend/src/components/task-history.test.tsx` 和 `asset-uploader.test.tsx` 验证查询失败保留运行状态并恢复。 |
| A08 | 上述前端测试验证终态停止轮询、用户切换和请求取消；使用真实计时器。 |
| A09 | CI 配置包含前端、后端和集成工作流；基线 `264e1ae` 的 [GitHub Actions 运行](https://github.com/yysk6/image-resource/actions/runs/41288936988) 已通过。 |

浏览器手工检查：桌面历史页、Tab/Enter 打开历史页及焦点可见、模板详情上传标签和禁用提交状态；375 像素宽详情页截图检查；阶段 4 已检查切换用户和刷新历史。代码审查发现备份权限和镜像回滚说明两项问题，修复后复查通过；隔离环境验证了通过镜像 ID 覆盖配置启动及健康检查。完整键盘遍历、浏览器手动断网恢复、并发任务期间的刷新与网络面板记录未执行，对应状态与恢复由组件和接口测试覆盖。未实施生产部署、数据库和素材备份恢复演练，未记录准确实际工时。服务重启后未完成任务不会自动恢复执行。
