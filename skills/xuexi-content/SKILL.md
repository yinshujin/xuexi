---
name: xuexi-content
description: 家庭小学数学 App（xuexi 仓库）的课程生成助手。用户想生成、查看、审核、打包或发布讲解课 / 技巧课时使用，例如"生成四年级上册第3单元的课""看看课程生成进度""把审核通过的课发布出去"。它会在本机 xuexi 仓库里运行 pnpm content 命令，调用 OpenMAIC 提前生成课程；App 运行时不调用模型。
user-invocable: true
---

# xuexi 课程生成助手

帮家长把北师大版数学（二年级上册 `bsd-g2a`、四年级上册 `bsd-g4a`）的讲解课和技巧课，用 OpenMAIC 提前生成、交给家长审核、打包发布。
所有命令都在 **xuexi 仓库根目录** 运行，命令说明见 [references/commands.md](references/commands.md)。

## 规则

- 一步一步来。执行会花钱或改动线上的命令（`gen`、`publish`）前，先说清楚要做什么、大约多少节课，得到确认再执行。
- **审核只能由家长本人完成。** 你可以启动审核页（`pnpm content review`）并告诉家长地址，但不要自己调用审核接口去"通过"或"打回"任何课。
- 不要让家长把 API Key、访问码、家庭口令贴到聊天里；请家长自己编辑 `content/openmaic.env`、`content/publish.env`。不要读取或回显这两个文件里的密钥值（可以检查某个变量是否已填写）。
- 不要修改 `content/state.json`；它由脚本维护。
- 生成失败时先看 `pnpm content status` 里的错误原因，再决定是否重试。

## 流程

### 1. 检查环境（第一次）

1. 确认在 xuexi 仓库根目录（有 `pnpm-workspace.yaml` 和 `tools/content/`），并且已运行过 `pnpm install`。
2. 确认 `content/openmaic.env` 存在（没有就让家长从 `content/openmaic.env.example` 复制并填写）。选择以下一种方式：
   - **本机 OpenMAIC**：需要 Docker（Mac 用 OrbStack 或 Docker Desktop），填写模型 Key（如 `QWEN_API_KEY`、`DEFAULT_MODEL`、`TTS_QWEN_API_KEY`）。
   - **官方托管版**：不需要 Docker，填写 `XUEXI_OPENMAIC_URL=https://open.maic.chat` 和 `ACCESS_CODE=sk-...`，每天限 10 节。
3. 本机方式需要先启动：`pnpm content openmaic up`（第一次 5–15 分钟），检查：`pnpm content openmaic status`。

### 2. 生成

1. 先用 `pnpm content list --book <书>` 看要生成哪些课，和家长确认范围（按单元、知识点或单节课）。
2. 第一次建议先试 1–2 节：`pnpm content gen --book bsd-g4a --unit 3 --limit 2`，让家长审核满意后再批量生成。
3. 批量：`pnpm content gen --book bsd-g4a --unit 3`。每节课几分钟；中途断了重新运行同一条命令会接着做。
4. 用托管版遇到"额度用完"会自动停下，告诉家长明天继续运行同一条命令。

### 3. 审核（家长操作）

运行 `pnpm content review`（它会一直运行），把地址 http://localhost:5180/#/review 告诉家长，请家长逐课试播后点"通过"或写意见"打回"。
被打回的课，再运行一次 `pnpm content gen`（同样的范围）会带着家长的意见重新生成。

### 4. 打包发布

1. `pnpm content build` —— 把通过的课打包，汇报新打包了几节、跳过了哪些及原因。
2. 确认 `content/publish.env` 已填写（参考 `deploy/publish.env.example`），再发布：
   - 免费 EdgeOne：`pnpm content publish --target edgeone`
   - 腾讯云服务器：`pnpm content publish --target tencent`（第一次加 `--init`）
   - 只生成网站文件：`pnpm content publish --target dir`
3. 本机 OpenMAIC 用完可以关掉：`pnpm content openmaic down`。

### 5. 汇报

用 `pnpm content status --book <书>` 汇总：已通过 / 待审核 / 失败 / 未生成各多少节，失败的列出原因。
