# pnpm content 命令速查

| 命令 | 作用 |
| --- | --- |
| `pnpm content openmaic up` / `down` / `status` / `logs` | 本机 Docker 启停 OpenMAIC（固定版本 v1.1.0） |
| `pnpm content mock [--port 3000]` | 模拟 OpenMAIC（示例课件 + 静音配音），不花钱试流程 |
| `pnpm content list [--book bsd-g2a\|bsd-g4a]` | 列出所有课和 id |
| `pnpm content gen [选项]` | 调用 OpenMAIC 生成课程（断点续跑） |
| `pnpm content author-brief --lesson <课id> \| --next [--book X] [--unit N] [--kind K] [--out 文件]` | 输出写一节课的要求和课件脚本格式；`--next` 挑下一节还没草稿（或被打回）的课 |
| `pnpm content import --lesson <课id> \| --all` | 把 `content/authored/<课id>.json` 编译成草稿，自动验算算式 |
| `pnpm content tts [--lesson <课id>] [--engine say\|edge] [--voice 名称] [--force] [--concurrency N] [--tts-cache 目录]` | 给没有语音的草稿配音（say：Mac 自带；edge：edge-tts） |
| `pnpm content status [--book X]` | 每节课状态：未生成 / 生成中 / 待审核 / 已通过 / 已打回 / 失败 |
| `pnpm content review [--port 5180]` | 本地审核页（家长操作） |
| `pnpm content approve --all \| --book X [--unit N] \| --lesson <课id> [--note 备注]` | 不试播直接批准待审核的课。**只有家长明确要求跳过审核时才用** |
| `pnpm content build` | 打包审核通过的课，生成 catalog.json |
| `pnpm content export [--book X] [--unit N] [--lesson 课id] [--out 文件.zip] [--title 标题]` | 把打包好的课导出成课程包文件，发到设备后在 App 家长模式里导入（不需要网站） |
| `pnpm content export --each-unit [--book X] [--out 目录]` | 每个单元导出一个课程包文件，并生成清单 index.md |
| `pnpm content publish --target dir\|edgeone\|tencent [--init] [--no-web-build]` | 发布 |

`gen` 的选项：

| 选项 | 说明 |
| --- | --- |
| `--book bsd-g2a` / `bsd-g4a` | 二年级上册 / 四年级上册 |
| `--unit 3` | 第几单元 |
| `--kp <知识点id>` | 只生成一个知识点的课 |
| `--lesson <课id>` | 只生成一节课（总是重新生成） |
| `--kind lecture` / `technique` | 只要讲解课 / 技巧课 |
| `--limit N` | 最多生成 N 节 |
| `--force` | 已生成 / 已通过的也重新生成 |
| `--stale` | 重新生成用旧提示词模板生成的课 |
| `--concurrency N` | 同时生成几节（默认 1，托管版保持 1） |

课程规模：二上 30 节讲解 + 25 节技巧，四上 28 节讲解 + 27 节技巧，共 110 节。

文件位置：
- `content/authored/<课id>.json`：你写的课件脚本（可以提交到 git）
- `content/openmaic.env`：模型 / 语音 Key 或托管版访问码（家长自己填）
- `content/publish.env`：发布参数（家长自己填）
- `content/state.json`：每节课的状态（脚本维护）
- `content/work/<课id>/draft/`：生成的草稿；`content/out/`：打包结果；`content/site/`：要发布的网站
