# 免费方案：部署到腾讯云 EdgeOne Pages

EdgeOne Pages 在 2026 年的控制台和 CLI 里也叫 **EdgeOne Makers**，`edgeone pages …` 命令还能用，但已经是旧别名，新命令是 `edgeone makers …`。

部署后的结构：

```
https://你的域名/                  静态 PWA（index.html、sw.js、assets/）
https://你的域名/catalog.json      课程目录
https://你的域名/packs/...         课程包（路径带版本号，长期缓存）
https://你的域名/api/*             同步接口：边缘函数 edge-functions/api/[[default]].js
                                   学习记录存在 KV 命名空间（绑定变量名 XUEXI_KV）
```

> **先说结论：一定要绑定自己的域名。**
> EdgeOne 送的默认域名（`项目名.edgeone.app`）从中国大陆访问会返回 401，只能用控制台生成的“预览链接”，有效期 3 小时，不适合孩子日常使用。
> 安卓 APK 和 PWA 安装、离线都要求 **HTTPS**；绑定自定义域名后平台会自动签发证书。

## 选哪个加速区域

| 区域                       | CLI 参数                        | 自定义域名要备案吗 | 大陆访问                         |
| -------------------------- | ------------------------------- | ------------------ | -------------------------------- |
| 全球可用区（不含中国大陆） | `EDGEONE_AREA=overseas`（默认） | **不需要**         | 走香港等境外节点，速度一般但可用 |
| 全球可用区（含中国大陆）   | `EDGEONE_AREA=global`           | **需要 ICP 备案**  | 走国内节点，更快                 |
| 中国大陆可用区             | 只能在控制台创建项目时选择      | 需要 ICP 备案      | 更快                             |

没有备案域名的话选“不含中国大陆”，随便在哪个注册商买个域名（约几十元/年）就能用。已有备案域名可以选“含中国大陆”。区域只在**创建项目时**生效，以后要改需要新建项目。

## 最省事：用 GitHub Actions 部署（不用在电脑上装任何东西）

仓库里有工作流 **Deploy to EdgeOne**（`.github/workflows/deploy-edgeone.yml`）：
在 GitHub 的机器上构建 App 和同步接口并上传到 EdgeOne。它会先把线上已经发布的课程包下载下来一起上传，所以随时运行都不会弄丢课程。

1. 按下面第 1、2 步注册账号、生成 API Token。
2. GitHub 仓库 → Settings → Secrets and variables → Actions：
   - **Secrets** 标签：新建 `EDGEONE_API_TOKEN` = 刚生成的 Token
   - **Variables** 标签（可选）：`EDGEONE_PROJECT` = 项目名（默认 `xuexi-family`）；绑定域名后再加 `SITE_URL` = `https://你的域名/`（结尾带 `/`）
3. Actions → Deploy to EdgeOne → Run workflow（区域选 overseas 不需要备案）。
4. 再做下面第 4–7 步（KV、环境变量、域名、检查），改完 KV 或环境变量后再运行一次这个工作流。

**自动更新**：之后每次代码推送到默认分支，流程自动进行：CI 测试通过 → 构建并签名新 APK（发布为 GitHub Release `app-latest`）→ 部署到 EdgeOne（带上线上已有课程和最新 APK）。
iPhone、Mac、Windows 上的网页版打开时自动更新；安卓 APK 里会出现"App 有新版本啦 → 下载安装"的提示（从你的网站 `/download/xuexi.apk` 下载，国内也能下）。

课程发布：在 Mac 上 `pnpm content publish --target edgeone`（会带上最新课程和最新 APK）。

## 第一次部署（家长照着做）

### 1. 注册账号

- 国内站：<https://console.cloud.tencent.com/edgeone/pages>（腾讯云账号，需要实名认证）
- 国际站：<https://edgeone.ai/pages>（可以用 Gmail 注册）

两个站点的项目和 API Token 不通用，后面几步都在同一个站点里做。

### 2. 生成 API Token

控制台 → EdgeOne Pages（Makers）→ **API Token** 标签页 → 创建 API Token → 填写描述、选择有效期 → 复制 Token。

把它填进 `content/publish.env`（模板见 `deploy/publish.env.example`）：

```bash
EDGEONE_API_TOKEN=粘贴的Token
EDGEONE_PROJECT=xuexi-family      # 项目名：小写字母、数字、短横线
EDGEONE_AREA=overseas             # 或 global（见上表）
```

### 3. 第一次发布（会自动创建项目）

```bash
pnpm content publish --target edgeone
# 相当于：构建站点到 content/site/，然后
#   bash deploy/edgeone/deploy.sh content/site
```

项目不存在时，CLI 会创建一个“直接上传”类型的项目。也可以先在控制台手动创建项目，这时要选择**直接上传**，项目名要和 `EDGEONE_PROJECT` 一致；用 Git 仓库创建的项目不能用 CLI 发布。

第一次发布后，页面已经能打开，但 `/api/*` 会返回 503 `not_configured`，因为还没有绑定 KV 和设置口令。接着做第 4、5 步。

### 4. 创建 KV 命名空间并绑定为 `XUEXI_KV`

1. 控制台 → EdgeOne Pages → **KV 存储** → 开通或申请（第一次使用需要开通）→ **创建命名空间**，名字随意，比如 `xuexi`。
2. 打开项目 → **KV 存储**（或“设置 → KV 存储绑定”）→ **绑定命名空间** → 选择刚创建的命名空间，**变量名填 `XUEXI_KV`**（必须完全一致，区分大小写）。

控制台菜单的名字可能随版本调整，找“KV”相关的入口即可。KV 目前只能在边缘函数里使用，我们的接口就是边缘函数。

### 5. 设置环境变量

项目 → 设置 → **环境变量**，添加：

| 变量                   | 说明                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `FAMILY_CODE`          | 家庭口令，每台设备第一次使用时输入。至少 8 位，建议 12 位以上，不要用生日。        |
| `TOKEN_SECRET`         | 签发登录令牌用的随机密钥，至少 32 位。可以运行 `openssl rand -base64 48` 生成。    |
| `KV_SETTLE_MS`（可选） | 默认 `60000`。新记录要等这么多毫秒后，其他设备才会拉到，原因见“限制”。             |
| `CORS_ORIGINS`（可选） | 默认 `*`。接口用 Bearer 令牌，不用 Cookie，保持 `*` 即可；APK 和桌面版要跨域访问。 |

修改 `FAMILY_CODE` 或 `TOKEN_SECRET` 后，所有设备都要重新输入口令，丢了设备时可以这样处理。

**改完 KV 绑定或环境变量后，要重新发布一次**（再运行一次 `pnpm content publish --target edgeone`，或者在控制台对最新部署点“重新部署”）。

### 6. 绑定自定义域名

项目 → **域名管理** → 添加自定义域名 → 按提示到域名注册商添加 **CNAME** 记录 → 等待验证，平台会自动申请 HTTPS 证书。

### 7. 检查

```bash
curl https://你的域名/api/health
# {"ok":true,"storage":"kv"}
```

浏览器打开 `https://你的域名/`，输入家庭口令，做几道题，再换一台设备登录，确认记录同步（有约 1 分钟延迟，见下文）。

## 以后更新内容

```bash
pnpm content publish --target edgeone
```

每次都会重新打包同步接口并整体上传站点。平台只保留最近 10 次成功部署的产物，更早的部署链接会失效，这不影响正式域名。

## 给内容 CLI 的接口（`pnpm content publish --target edgeone`）

```bash
bash deploy/edgeone/deploy.sh <siteDir>
```

- `<siteDir>`：已经构建好的静态站点目录（例如 `content/site/`），里面要有 `index.html`、`catalog.json`、`packs/`。
- 环境变量（从 `content/publish.env` 读取）：
  - `EDGEONE_API_TOKEN`（必填）
  - `EDGEONE_PROJECT`（必填）
  - `EDGEONE_ENV`：`production`（默认）或 `preview`
  - `EDGEONE_AREA`：`overseas`（默认）或 `global`，只在 CLI 创建项目时生效
  - `EDGEONE_CLI_VERSION`：`npx edgeone@<版本>` 的版本号，默认 `1`（1.x 最新版）
  - `EDGEONE_BIN`：可选，指定已安装的 `edgeone` 可执行文件，不走 npx
- 脚本会执行：
  1. `node apps/sync/scripts/build-edgeone.mjs <siteDir>`，写入：
     - `<siteDir>/edge-functions/api/[[default]].js`：打包好的同步接口，单文件，没有外部依赖
     - `<siteDir>/package.json`：最小内容，只在不存在时写入。CLI 文档要求手动构建时把函数目录和 `package.json` 一起放进输出目录
     - `<siteDir>/edgeone.json`：缓存、CORS 和安全响应头，从 `deploy/edgeone/edgeone.json` 复制，只在不存在时写入
  2. `npx --yes edgeone@1 makers deploy <siteDir> -n $EDGEONE_PROJECT -t $EDGEONE_API_TOKEN -e $EDGEONE_ENV -a $EDGEONE_AREA`
- 需要 Node 22 和网络，退出码非 0 表示失败。

`edgeone.json` 里的响应头规则：

- `/packs/*`：`Cache-Control: public, max-age=31536000, immutable`，加 `Access-Control-Allow-Origin: *`
- `/catalog.json`：`no-cache`，加 `Access-Control-Allow-Origin: *`
- `/`、`/index.html`、`/sw.js`、`/manifest.webmanifest`：`no-cache`
- `/assets/*`：长期缓存，因为 Vite 构建的文件名带哈希
- 全站：`nosniff`、`Referrer-Policy`、`X-Frame-Options`

如果 web 构建自己生成了 `edgeone.json`，脚本不会覆盖它，这时要把上面的规则合并进去。

## 限制与取舍（KV 版）

- **最终一致**：EdgeOne KV 的写入最多约 60 秒才能同步到所有节点。为了不让拉取游标跳过还在同步中的数据，接口只返回写入超过 `KV_SETTLE_MS`（默认 60 秒）的记录。所以**另一台设备大约 1 分钟后才能看到新记录**。做题的设备本地立即可见，不受影响。
- **去重**：每次上传只读写一个“最近事件 ID 索引”（最近 2 万条），不为每条记录单独写标记，这样写入次数少，不容易触到 KV 额度。代价是：很久以前的记录如果被重复上传，可能存成两份；两台设备同时上传时也可能偶尔重复。客户端按事件 `id` 存 IndexedDB，重复记录会覆盖成一条，不影响统计。
- **家庭档案并发**：`PUT /api/family` 是“先读、比较版本、再写”，KV 没有原子操作，两台设备同时改设置时，极少数情况下后写的会覆盖先写的。家庭场景基本不会遇到。
- **口令防暴力**：失败次数限制在内存里，同一 IP 15 分钟内最多 10 次，全局最多 100 次。边缘函数实例会被回收，不同节点之间也不共享计数，只能拖慢暴力尝试，所以**口令本身要够长**。
- **KV 键名**只能用字母、数字、下划线，最长 512 字节，值最大 25 MB。事件分块存储，每块不超过 256 KB，大批量上传会自动拆块。
- **导出与备份**：KV 没有一键导出。可以用 App 的导出功能，或者带令牌循环调用 `GET /api/events?after=<cursor>` 把全部记录拉下来。

## 免费额度（以官网为准，可能调整）

- Pages 免费版目前处于限时免费阶段，官方说函数调用次数、存储和构建次数有**月度额度**，静态加速流量和请求数不限。具体数字见 <https://pages.edgeone.ai/document/limits-and-quotas>。
- KV：账号总容量 1 GB（官方文档摘要），目前只能在边缘函数里使用。我们每次上传写 2 个键（事件块和 ID 索引），每次拉取读 1 到 50 个键。
- 方案文档里写“所有项目总大小不超过 5 GB”，每个课程包大约 5 到 10 MB，两个年级一学期不到 1 GB。

## 核实情况

**已核实**（来源：`edgeone` npm 包 1.6.41 的 README 和源码、`@edgeone/types` 1.0.2、官方模板仓库 <https://github.com/TencentEdgeOne/pages-templates> 的 `examples/hono`、`examples/functions-kv`、`examples/functions-fetch`）：

- 命令是 `edgeone makers deploy [<目录或zip>] -n <项目> -t <token> -e production|preview -a global|overseas`，`edgeone pages` 是旧别名。
- 边缘函数目录是 `edge-functions/`，旧名 `functions/` 也还能识别。最后一段写成 `[[name]]` 表示多级通配，所以 `edge-functions/api/[[default]].js` 对应路由 `^/api/(.*)$`（本地 `edgeone makers build` 已确认）。
- 处理函数写法是 `export function onRequest(context)`，`context` 里有 `request`、`params`、`env`，客户端 IP 在 `request.eo.clientIp`。
- **CLI 构建器是按名字引用顶层 `onRequest` 函数的**，所以打包时不能压缩标识符，否则函数会被**静默丢弃**。`build-edgeone.mjs` 已处理并会检查这一点。
- **CLI 构建器会把函数代码整段内联到“每个请求”的处理函数里**，模块级变量每次请求都会重建。所以 Hono 实例和限流计数挂在 `globalThis` 上。
- 在 Node 里用 CLI 本地构建出的 `.edgeone/edge-functions/index.js` 模拟运行，健康检查、登录、上传、拉取、限流都通过。
- KV 以全局变量的形式注入，名字就是绑定时填的变量名。API：`get(key)` 默认返回文本，不存在时返回 `null`；`put(key, value)`；`delete(key)`；`list({prefix, limit, cursor})` 返回 `{keys:[{key}], complete, cursor}`，官方示例用上一页最后一个 key 作为下一页的 cursor。键名规则 `^[A-Za-z0-9_]+$`，最长 512 字节，值最大 25 MB，这些来自 CLI 内置的 KV 客户端。
- `edgeone.json` 支持 `headers`（每个 `source` 最多一个 `*`），`edgeone validate` 校验通过。
- 手动构建时，要把函数目录和 `package.json` 放进输出目录后再 `deploy <目录>`（CLI README 原文）。
- CLI 用 `-t` 时会根据 Token 自动判断国内站还是国际站。

**未能实际验证**（沙箱无法访问 edgeone.ai、pages.edgeone.ai、cloud.tencent.com，也没有账号）：

- 真正上传到 EdgeOne 后，平台端对上传目录里 `edge-functions/` 的构建，以及 `edgeone.json` 响应头是否生效。
- 线上 KV 的 `list` 顺序是否严格按字典序、cursor 是否不包含该键本身。代码对这两点都做了防御：会重新排序并过滤掉不大于游标的键。
- 线上边缘运行时的 Web Crypto（HMAC-SHA256）。官方 Hono 模板能运行说明是标准 Web API 环境，但没有实测。
- 控制台菜单的具体名称、免费额度的具体数字、默认域名 401 和 3 小时预览链接的规则。这些来自搜索结果摘要（<https://pages.edgeone.ai/document/limits-and-quotas>、<https://pages.edgeone.ai/document/kv-storage>、<https://edgeone.ai/document/175201436167872512>），没有打开原文核对。

第一次上线后请按“7. 检查”验证。如果 `/api/health` 返回的是 404 页面而不是 JSON，说明平台没有识别 `edge-functions/`，可以试试旧目录名：

```bash
node apps/sync/scripts/build-edgeone.mjs content/site --functions-dir functions
```

然后删掉 `content/site/edge-functions/` 再发布。
