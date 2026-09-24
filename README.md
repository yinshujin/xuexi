# xuexi：家庭小学数学学习 App

给自家孩子用的小学数学补习和巩固应用。按深圳北师大版课本同步，以**专项练习**为核心，配合 AI 生成、家长审核的**讲解课和技巧课**。
支持华为平板（HarmonyOS 4.x，装 APK）、安卓手机、iPhone、Mac、Windows。讲解课由开源项目 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)（MIT）提前生成，**App 运行时不调用任何大模型**。

- 使用指南（家长）：[docs/guide.md](docs/guide.md)
- 方案设计：[docs/solution-plan.md](docs/solution-plan.md)

## 快速试用（不需要任何 Key）

```bash
pnpm install
pnpm content mock                        # 终端 1：模拟 OpenMAIC
pnpm content gen --book bsd-g4a --limit 2 # 终端 2：生成两节示例课
pnpm content review                      # 浏览器打开 http://localhost:5180/#/review 试播、通过
pnpm content build && pnpm content publish --target dir   # 生成 content/site
```

## 目录

| 路径 | 内容 |
| --- | --- |
| `apps/web` | 孩子端 + 家长模式 + 审核页（React PWA） |
| `apps/sync` | 学习记录同步接口（Hono；Node + SQLite / EdgeOne KV） |
| `packages/practice` | 出题器、判分、错因诊断、掌握度、间隔复习、错题本、今日任务 |
| `packages/curriculum` | 北师大版二上、四上知识点树与生成提示词 |
| `packages/player` | 讲解课离线播放引擎（部分移植自 OpenMAIC） |
| `packages/course-pack` | 课程包格式与 OpenMAIC 课件转换 |
| `tools/content` | `pnpm content` 生成 / 审核 / 打包 / 发布脚本 |
| `shells/tauri` | 安卓 APK、Mac、Windows 打包 |
| `deploy/` | EdgeOne Pages（免费）和腾讯云服务器部署 |

开发：`pnpm test`、`pnpm typecheck`、`pnpm dev`（Web 开发服务器）。

## 致谢

讲解课生成使用 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)（MIT License, Copyright (c) 2026 THU-MAIC），
播放器中白板与动作执行逻辑移植自该项目，并使用其 `@openmaic/dsl`、`@openmaic/renderer` 包。
