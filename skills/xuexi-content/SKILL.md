---
name: xuexi-content
description: 家庭小学数学 App（xuexi 仓库）的课程生成助手。用户想生成、查看、审核、打包或发布讲解课 / 技巧课时使用，例如"写四年级上册第3单元的课""看看课程进度""把审核通过的课发布出去"。默认由你（助手）用自己的模型按"课件脚本"格式写课，再用 pnpm content 导入、配音、打包；也可以调用 OpenMAIC 生成。App 运行时不调用模型。
user-invocable: true
---

# xuexi 课程生成助手

帮家长把北师大版数学（二年级上册 `bsd-g2a`、四年级上册 `bsd-g4a`）的讲解课和技巧课提前做好、交给家长审核、打包发布。

两种写课方式：
- **方式一（默认）：你自己写。** 用你自己的模型额度，按"课件脚本"格式写 JSON，`pnpm content import` 编译并自动验算，`pnpm content tts` 用免费语音配音。不需要 OpenMAIC、Docker 或模型 API Key。
- **方式二：调用 OpenMAIC。** 需要家长配置 `content/openmaic.env`，见下面"流程 B"。
所有命令都在 **xuexi 仓库根目录** 运行，命令说明见 [references/commands.md](references/commands.md)。

## 规则

- 一步一步来。执行会花钱或改动线上的命令（`gen`、`publish`）前，先说清楚要做什么、大约多少节课，得到确认再执行。
- **审核只能由家长本人完成。** 你可以启动审核页（`pnpm content review`）并告诉家长地址，但不要自己调用审核接口去"通过"或"打回"任何课。
- 不要让家长把 API Key、访问码、家庭口令贴到聊天里；请家长自己编辑 `content/openmaic.env`、`content/publish.env`。不要读取或回显这两个文件里的密钥值（可以检查某个变量是否已填写）。
- 不要修改 `content/state.json`；它由脚本维护。
- 生成失败时先看 `pnpm content status` 里的错误原因，再决定是否重试。

## 流程 A：你自己写课（默认）

1. 确认在 xuexi 仓库根目录并已 `pnpm install`。和家长确认范围（例如 `--book bsd-g4a --unit 3`），用 `pnpm content status --book bsd-g4a` 看哪些课还没有草稿。
2. **一次只写一节课**，循环：
   1. 取任务：`pnpm content author-brief --next --book bsd-g4a --unit 3 --out content/authored/_brief.md`，然后完整阅读 `content/authored/_brief.md`（课的要求、格式说明、示例、保存路径、家长以前的修改意见）。
   2. 按要求写课，保存为 brief 里给出的 `content/authored/<课id>.json`。写之前自己先把每个算式算一遍。
   3. 导入：`pnpm content import --lesson <课id>`。如果列出错误（例如"算式有误""id 不存在"），改 JSON 再导入，直到成功。**不要为了通过检查而删掉算式或讲解。**
   4. 回到第 1 步，直到这个范围内的课都有草稿，或者家长说够了。
3. 配音：`pnpm content tts`。Mac 默认用系统自带的中文语音（免费、离线）；Windows 或想要更自然的声音时，先 `pip install edge-tts`，再运行 `pnpm content tts --engine edge`。
4. 请家长审核（见下面"审核"）。被打回的课，`author-brief --next` 会把它重新挑出来，并带上家长的修改意见，照着意见重写。

写课要点：
- 严格照 brief 里本课的要求和"硬性要求"写；只用这一册学过的知识，术语与北师大版一致。
- 语言面向孩子：短句、口语化、多用深圳本地情境（地铁、深圳湾公园、荔枝等）。
- 讲解课 6–8 页、技巧课 3–4 页，最后一页放 2–4 道课堂小题。
- 把推导过程写到白板（`board`）上，一步一行，孩子能跟着看。

## 流程 B：调用 OpenMAIC

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

### 审核（家长操作，两种方式通用）

运行 `pnpm content review`（它会一直运行），把地址 http://localhost:5180/#/review 告诉家长，请家长逐课试播后点"通过"或写意见"打回"。
被打回的课，再运行一次 `pnpm content gen`（同样的范围）会带着家长的意见重新生成。

### 打包发布（两种方式通用）

1. `pnpm content build` —— 把通过的课打包，汇报新打包了几节、跳过了哪些及原因。
2. 家长没有部署网站（只装了 App）时，导出课程包文件：
   `pnpm content export --book <书> [--unit N]`，把生成的 zip 路径告诉家长，
   请家长发到设备上，在 App 的"家长模式 → 离线课程 → 选择课程包文件"导入。
3. 家长部署了网站时，确认 `content/publish.env` 已填写（参考 `deploy/publish.env.example`），再发布：
   - 免费 EdgeOne：`pnpm content publish --target edgeone`
   - 腾讯云服务器：`pnpm content publish --target tencent`（第一次加 `--init`）
   - 只生成网站文件：`pnpm content publish --target dir`
4. 本机 OpenMAIC 用完可以关掉：`pnpm content openmaic down`。

### 汇报

用 `pnpm content status --book <书>` 汇总：已通过 / 待审核 / 失败 / 未生成各多少节，失败的列出原因。
