# 使用指南（家长）

这份指南按顺序讲：准备 → 生成课程 → 审核 → 发布 → 在各设备上安装 → 日常使用。

整体流程：

```
你的 Mac/Windows                                   线上（二选一）                 孩子的设备
pnpm content gen   → 生成讲解课/技巧课（含配音）
pnpm content review → 逐课试播，通过/打回
pnpm content build → 打包成课程包
pnpm content publish ────────────────────────→  EdgeOne Pages（免费）  ←──  华为平板 / vivo（APK）
                                                  或 腾讯云服务器         ←──  iPhone / Mac / Windows（PWA）
pnpm content export ──→ 课程包文件 .zip ──（微信 / 数据线）──────────────→  APK / 桌面 App 直接导入（不需要网站）
```

App 运行时**不调用任何大模型**：讲解课是提前生成、你审核过的静态内容；练习题由程序在设备上现场出题，答案由程序计算。

---

## 0. 先核对课本（重要）

- **四年级上册**：目前按北师大版 **2014 版**目录编写。有报道说 2026 年秋季四年级开始换用 2024 修订版新教材（新版四上可能移走"生活中的负数""可能性"，除法、方向与位置也有调整）。
  请翻一下孩子课本的版权页和目录：如果是新版，把目录拍照发给我，我来更新 `packages/curriculum/src/books/bsd-g4a.ts`。
- **二年级上册**：按 2024 修订版编写，第 6、7、8 单元个别课时名称没能完全核实，也请对照目录看一下。
- **语文、英语（目前各做了前两个单元）**：目录是根据网上检索摘要整理的（原网页打不开），请翻课本目录核对：
  - 语文二上（统编版 2024 修订）：一 小蝌蚪找妈妈 / 我是什么 / 植物妈妈有办法 / 口语交际 有趣的动物；二 场景歌 / 树之歌 / 拍手歌 / 田家四季歌。
  - 语文四上（统编版 2026 修订）：一 观潮 / 现代诗二首 / 繁星 / 习作 推荐一个好地方；二 一个豆荚里的五粒豆 / 夜间飞行的秘密 / 方帽子店 / 田忌赛马 / 习作 我的家人。
  - 英语二上（沪教牛津版 深圳用）：Unit 1 Good morning；Unit 2 I'm Danny。
  - 英语四上（沪教牛津版 深圳用）：Unit 1 Meeting new people；Unit 2 Can you swim?
  每本书的核对情况写在 `packages/curriculum/src/books/*.ts` 的 sourceNote 里。有出入就把目录拍照发给我。
  语文、英语暂时只有讲解课和技巧课，专项练习题还是数学的。
- 已有的孩子档案要加上语文、英语：家长模式 → 孩子 → 点"＋ 添加新课本"。

## 1. 准备（只做一次）

1. 安装 [Node.js 22](https://nodejs.org/)、[pnpm](https://pnpm.io/zh/installation)（`npm i -g pnpm`）、[Git](https://git-scm.com/)。
2. 安装 Docker：Mac 推荐 [OrbStack](https://orbstack.dev/) 或 Docker Desktop；Windows 用 Docker Desktop。只在生成课程时需要。
3. 下载代码并安装依赖：
   ```bash
   git clone https://github.com/yinshujin/xuexi.git
   cd xuexi
   pnpm install
   ```
4. 准备模型和配音的 API Key，写到 `content/openmaic.env`：
   ```bash
   cp content/openmaic.env.example content/openmaic.env
   # 用文本编辑器打开，填入 Key
   ```
   推荐阿里云百炼：一个 Key 同时填 `QWEN_API_KEY` 和 `TTS_QWEN_API_KEY`，`DEFAULT_MODEL=qwen:qwen3.7-plus`。
   这个文件只在你的电脑上，已被 git 忽略。

> **先试流程，不花钱**：`pnpm content mock` 会启动一个模拟的 OpenMAIC（示例课件 + 静音配音），
> 不需要 Docker 和 Key，可以先把"生成 → 审核 → 打包 → 发布"整个流程走一遍。
> 试完后删掉 `content/state.json` 和 `content/work/`、`content/out/` 再正式生成。

### 不想装 Docker？用 OpenMAIC 官方托管版

在 [open.maic.chat](https://open.maic.chat/) 登录 → 右上角账号 → 访问码设置 → 生成访问码，然后在 `content/openmaic.env` 里只写两行：

```env
XUEXI_OPENMAIC_URL=https://open.maic.chat
ACCESS_CODE=sk-你的访问码
```

不需要 `openmaic up`，也不需要自己的模型 Key。限制：每天最多 10 节课，额度用完脚本会自动停下，第二天再运行同一条命令接着做。

### 用 WorkBuddy 自己的额度写课（不需要 OpenMAIC 和模型 Key）

1. 把仓库里的 `skills/xuexi-content/` 文件夹（或打包成 zip）导入 WorkBuddy 的技能。
2. 在 WorkBuddy 里打开 xuexi 仓库目录，说"用 xuexi-content 技能，写四年级上册第 3 单元的课，先写 2 节"。
3. WorkBuddy 会一节一节地：取任务（`pnpm content author-brief --next`）→ 用它自己的模型写"课件脚本"JSON → `pnpm content import`（自动检查格式并验算所有算式，有错会让它改）。
4. 写完后配音：`pnpm content tts`（Mac 自带中文语音，免费离线；想要更自然的声音可以 `pip install edge-tts` 后加 `--engine edge`）。
5. 你在审核页里审核，然后 build、publish，和下面的流程一样。

和 OpenMAIC 相比：画面是统一的简洁版式（标题、文字、彩色卡片、公式、表格、白板推导、课堂小题），没有 AI 配图；好处是不花额外的钱、每节课都经过算式验算。

## 2. 生成课程

```bash
pnpm content openmaic up                 # 第一次会下载并构建 OpenMAIC，约 5–15 分钟
pnpm content list --book bsd-g4a         # 看看有哪些课
pnpm content gen --book bsd-g4a --unit 3 # 生成四年级上册第 3 单元的全部课
pnpm content status                      # 查看进度
pnpm content openmaic down               # 用完关掉，释放内存
```

常用参数：

| 参数 | 说明 |
| --- | --- |
| `--book bsd-g2a` / `bsd-g4a` | 二年级上册 / 四年级上册 |
| `--unit 3` | 第几单元 |
| `--kp <知识点id>` / `--lesson <课id>` | 只生成某个知识点 / 某一节课（id 用 `list` 查） |
| `--kind lecture` / `technique` | 只生成讲解课 / 技巧课 |
| `--limit 2` | 先生成 2 节看看效果 |
| `--force` | 已经生成过的也重新生成 |
| `--stale` | 提示词模板更新后，重新生成用旧模板生成的课 |

- 每节课大约需要几分钟；中途断了，再运行同一条命令会接着做，已完成的不会重复生成。
- 失败的课会显示原因，再运行一次 `gen` 会自动重试。
- 每节课的草稿在 `content/work/<课id>/`。

## 3. 审核

```bash
pnpm content review
```

浏览器打开 <http://localhost:5180/#/review>：

- 按"待审核"筛选，点"试播审核"，像孩子一样把课看一遍；
- 右侧有这节课的要求和生成时的提醒（例如某句讲解没有配音）；
- 没问题点 **通过**；有问题写下修改意见点 **打回重做**。

被打回的课，下次运行 `pnpm content gen` 时会带着你的意见自动重新生成。

审核要点：知识点与课本一致、没有超纲；计算和答案都正确；语言孩子听得懂；没有不合适的内容。

## 4. 打包和发布

有两种用法，任选其一（也可以同时用）：

| | 不用网站：只装 App | 家庭网站（EdgeOne / 腾讯云） |
| --- | --- | --- |
| 课程怎么到设备上 | APK 自带全部已发布的课；更新的课也可以用课程包文件（.zip）导入 | 发布到网站，设备上一键下载 |
| 学习记录 | 只存在这台设备上；换设备用"导出备份 / 从备份恢复" | 多台设备自动同步 |
| 支持的设备 | 华为平板、vivo（APK），Mac、Windows（安装包） | 以上全部，外加 iPhone / iPad |
| App 更新 | 家长模式 → 设置 → 检查更新，下载新 APK 覆盖安装 | 打开 App 时自动提示 |

### 方式一：不用网站，直接导入课程包文件

**App 自带课程**：每次构建 APK 时，都会把当时 `courses-latest` 里的所有课打包进安装包，装好 App 打开就能上课，
不用导入任何文件。课程有更新时，GitHub 会自动重新构建 APK，下载新 APK 覆盖安装即可（学习记录不会丢）。
不想重装 App 的话，也可以只下载更新的单元课程包导入，App 会自动用较新的版本。

**课程包文件**：`content/authored/` 里的课件脚本一有更新，GitHub Actions 的 "Course bundles" 就会自动配音、打包，
把每个单元的课程包文件发布到仓库 Releases 页面的 **`courses-latest`**。在平板上打开这个页面，点单元对应的 zip 下载，
再到 App 里导入即可。注意：自动打包会跳过逐节试播（`pnpm content approve --all`），建议孩子上课前你先在 App 里看一遍，
有问题告诉我改。

也可以在自己电脑上打包：

```bash
pnpm content build                                   # 把通过的课打包
pnpm content export --book bsd-g4a --unit 3          # 导出四上第 3 单元 → content/exports/xuexi-bsd-g4a-u3-日期.zip
pnpm content export --book bsd-g2a                   # 导出整本二上
pnpm content export --lesson <课id>                  # 只导出一节课
```

把 zip 文件发到平板 / 手机上（微信"文件传输助手"、QQ、数据线都可以），然后在 App 里：
**家长模式 → 离线课程 → 选择课程包文件**。App 会逐个校验文件，导入后没有网络也能上课。
同一节课重新审核通过后，再导出、再导入一次即可替换成新版本。

注意：
- 这种方式下每台设备的学习记录各自独立。换设备、重装 App 或"清除数据"之前，先在 **家长模式 → 设置 → 学习记录备份** 里导出备份，到新设备上"从备份恢复"。
- iPhone / iPad 没有 APK，只能用网站方式（PWA）。
- 以后想换成网站方式：家长模式 → 设置 → 登录家庭账号，本机的孩子和学习记录会合并到家庭账号里。

### 方式二：发布到家庭网站

```bash
pnpm content build                        # 把通过的课打包成课程包，生成 catalog.json
pnpm content publish --target edgeone     # 发布到 EdgeOne Pages（免费）
# 或
pnpm content publish --target tencent     # 发布到腾讯云服务器
# 或
pnpm content publish --target dir         # 只生成 content/site/，自己上传到任何静态网站
```

- 已发布的课重新生成时，旧版本会一直在线，直到新版本审核通过并重新发布。
- 部署的一次性设置见 [deploy/edgeone/README.md](../deploy/edgeone/README.md) 和 [deploy/tencent/README.md](../deploy/tencent/README.md)，发布参数写在 `content/publish.env`（参考 `deploy/publish.env.example`）。

## 5. 在设备上安装

| 设备 | 安装方式 |
| --- | --- |
| 华为平板（HarmonyOS 4.x）、vivo 手机 | 安装 APK：在 GitHub 仓库的 Actions 里运行 "Android APK"，下载产物里的 `.apk` 传到设备上安装。华为需要在"设置 → 系统和更新 → 纯净模式"里关闭纯净模式（或允许安装外部来源应用） |
| iPhone / iPad | Safari 打开网站 → 分享 → 添加到主屏幕 |
| Mac | Safari 打开网站 → 文件 → 添加到程序坞（或 Chrome 地址栏右侧"安装"） |
| Windows | Edge / Chrome 打开网站 → 地址栏右侧"安装应用"；也可以在 Actions 里运行 "Desktop apps" 获取安装包 |

最新的 APK 也可以直接在仓库的 Releases 页面 `app-latest` 下载（每次代码更新后自动构建）。

APK 第一次打开时点 **"开始使用"** 就能直接用（不用网站的方式）。
如果部署了家庭网站，点下面的"我有家庭网站"，填写网站地址（例如 `https://xuexi.example.com/`）和家庭口令。
网站必须是 **HTTPS**（EdgeOne 默认就是；腾讯云需要绑定域名）。

APK 签名：先在电脑上运行一次 `bash shells/tauri/scripts/create-keystore.sh`，按提示把三项填到 GitHub 仓库的 Secrets 里。
这样每次构建的 APK 都能直接覆盖安装升级。

## 6. 日常使用

- **孩子**：选自己的头像 → 首页的"今日任务"（口算热身 → 到期复习 → 错题重练 → 当前知识点练习），
  或者进"知识地图"挑一个知识点：先看讲解课，再做专项练习。
- **错题**：做错的题自动进入错题本；原题做对、并且在不同的两天各做对一道同类题，才算真正消灭。
- **家长模式**（首页底部，需要家长密码）：
  - 学习报告：每个知识点的掌握情况、常见错因、每天学习时长；
  - 孩子：添加 / 编辑孩子档案和课本；
  - 离线课程：从课程包文件导入课程，或把网站上的课程提前下载到这台设备，没网也能上课；
  - 设置：每日时长上限、护眼提醒间隔、掌握标准；学习记录备份 / 恢复；App 版本和检查更新。
- 登录了家庭账号时，多台设备的学习记录会自动同步（联网时）。
