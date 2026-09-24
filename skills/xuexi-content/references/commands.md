# pnpm content 命令速查

| 命令 | 作用 |
| --- | --- |
| `pnpm content openmaic up` / `down` / `status` / `logs` | 本机 Docker 启停 OpenMAIC（固定版本 v1.1.0） |
| `pnpm content mock [--port 3000]` | 模拟 OpenMAIC（示例课件 + 静音配音），不花钱试流程 |
| `pnpm content list [--book bsd-g2a\|bsd-g4a]` | 列出所有课和 id |
| `pnpm content gen [选项]` | 生成课程（断点续跑） |
| `pnpm content status [--book X]` | 每节课状态：未生成 / 生成中 / 待审核 / 已通过 / 已打回 / 失败 |
| `pnpm content review [--port 5180]` | 本地审核页（家长操作） |
| `pnpm content build` | 打包审核通过的课，生成 catalog.json |
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

课程规模：二上 30 节讲解 + 24 节技巧，四上 28 节讲解 + 25 节技巧，共 107 节。

文件位置：
- `content/openmaic.env`：模型 / 语音 Key 或托管版访问码（家长自己填）
- `content/publish.env`：发布参数（家长自己填）
- `content/state.json`：每节课的状态（脚本维护）
- `content/work/<课id>/draft/`：生成的草稿；`content/out/`：打包结果；`content/site/`：要发布的网站
