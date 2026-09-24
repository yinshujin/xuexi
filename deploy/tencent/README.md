# 付费方案：腾讯云轻量应用服务器 + Docker

一台服务器上跑两个容器：

```
caddy  ：80/443，自动申请 HTTPS 证书
         托管 ./site（PWA、catalog.json、packs/）
         /api/* 反向代理到 sync:8787
sync   ：Hono + Node 22 + SQLite（node:sqlite，没有原生依赖）
         数据库放在 Docker 卷 sync_data，每天备份到 ./backups
```

服务器上的目录 `/srv/xuexi`：

```
docker-compose.yml  Caddyfile  backup.sh  .env  .env.example
site/      静态站点，由 deploy.sh 用 rsync 上传
src/       apps/sync 和 packages/shared 的源码，用来构建 sync 镜像
backups/   每日备份 xuexi-YYYYmmdd-HHMMSS.db.gz，保留 14 天
```

> **一定要用域名和 HTTPS。** PWA 安装、离线使用和安卓 APK 都要求 HTTPS。APK 从本地地址（如 `https://tauri.localhost`）加载页面，再跨域访问服务器；如果服务器是 http，请求会被当成混合内容拦截。
> `SITE_DOMAIN` 留空或填 IP 时，Caddy 只提供 http://IP:80，只能在浏览器里临时试用。

## 1. 购买轻量应用服务器

- 推荐地域：**中国香港**，套餐 **2 核 2G** 就够了，带宽 30M 左右。
  香港**不需要 ICP 备案**，大陆访问延迟约 30 到 50 ms。
- 广州、上海等大陆地域更快，但**域名必须先完成 ICP 备案**，个人备案大约 1 到 3 周。未备案的域名访问大陆服务器的 80/443 端口会被拦截。
- 镜像：选“应用镜像 → **Docker CE**”（Ubuntu + Docker 已装好）；或者选系统镜像 Ubuntu 22.04/24.04，再按第 3 步自己装 Docker。
- 登录方式：建议在控制台“密钥”里创建或导入 SSH 密钥并绑定到实例，默认用户是 `ubuntu`。

## 2. 防火墙

轻量服务器控制台 → 实例 → **防火墙** → 添加规则：

| 协议 | 端口 | 用途                         |
| ---- | ---- | ---------------------------- |
| TCP  | 22   | SSH（默认已放行）            |
| TCP  | 80   | HTTP：申请证书、跳转到 HTTPS |
| TCP  | 443  | HTTPS                        |
| UDP  | 443  | HTTP/3（可选）               |

## 3. 安装 Docker（已选 Docker CE 镜像可跳过）

```bash
ssh ubuntu@服务器IP
curl -fsSL https://get.docker.com | sudo sh     # 大陆地域加参数：| sudo sh -s -- --mirror Aliyun
sudo usermod -aG docker ubuntu                  # 之后重新登录一次，就不用 sudo 执行 docker 了
sudo apt-get install -y rsync
docker compose version                          # 要求 Docker 23 以上，并带 compose 和 buildx 插件
```

大陆地域从 Docker Hub 拉镜像很慢或失败时，可以使用腾讯云内网镜像加速，然后执行 `sudo systemctl restart docker`：

```bash
echo '{ "registry-mirrors": ["https://mirror.ccs.tencentyun.com"] }' | sudo tee /etc/docker/daemon.json
```

也可以在服务器的 `/srv/xuexi/.env` 里设置 `NODE_IMAGE`、`CADDY_IMAGE`、`NPM_REGISTRY=https://registry.npmmirror.com`，参考 `.env.example`。

## 4. 域名解析

在域名注册商（腾讯云 DNSPod、阿里云等）添加一条 **A 记录**：`xuexi.你的域名.com → 服务器公网 IP`。等解析生效（`ping xuexi.你的域名.com` 能看到 IP）后，再做第一次部署。Caddy 启动时会自动申请 Let's Encrypt 证书并定期续期，前提是 80 和 443 端口能从外网访问。

## 5. 第一次部署

在自己电脑上的仓库目录里，编辑 `content/publish.env`（模板见 `deploy/publish.env.example`）：

```bash
TENCENT_HOST=ubuntu@服务器IP
TENCENT_SSH_KEY=~/.ssh/lighthouse.pem   # 可选
SITE_DOMAIN=xuexi.你的域名.com
FAMILY_CODE=家庭口令至少8位             # 每台设备第一次使用时输入
TOKEN_SECRET=                           # 留空会在服务器上自动生成
```

然后执行：

```bash
set -a; source content/publish.env; set +a
# 先用内容 CLI 把站点构建到 content/site/，然后：
bash deploy/tencent/deploy.sh --init content/site
```

`--init` 会做这些事：

1. 在服务器上创建 `/srv/xuexi`，没有权限时用 sudo 创建并改归属。
2. 上传 `docker-compose.yml`、`Caddyfile`、`backup.sh`、`.env.example`，以及 `apps/sync`、`packages/shared` 的源码到 `src/`。
3. 服务器上没有 `.env` 时，用上面的变量生成一个，文件权限 600。已有 `.env` 时**不会覆盖**。
4. 执行 `docker compose up -d --build`，第一次构建 sync 镜像大约需要 1 分钟。
5. 安装每日备份的 cron 任务，每天 03:17 执行。
6. 上传站点。

检查：

```bash
curl https://xuexi.你的域名.com/api/health     # {"ok":true,"storage":"sqlite"}
```

如果 `--init` 提示“已把你加入 docker 组”，再执行一次 `--init` 即可装好备份任务。

## 6. 更新内容（日常）

```bash
pnpm content publish --target tencent
# 相当于：bash deploy/tencent/deploy.sh content/site
```

站点分两轮用 rsync 上传：第一轮上传除入口文件以外的新文件，第二轮上传 `index.html`、`sw.js`、`catalog.json`，并删除已经不存在的旧文件。这样设备不会拿到引用了未上传文件的新首页。Caddy 直接读取目录，**不用重启**。

同步服务的代码有更新时（`apps/sync` 改动），重新执行 `bash deploy/tencent/deploy.sh --init`，它会重新构建镜像并重启容器，只会中断几秒钟。

修改配置：SSH 到服务器，编辑 `/srv/xuexi/.env`，然后在 `/srv/xuexi` 下执行 `docker compose up -d`。修改 `FAMILY_CODE` 或 `TOKEN_SECRET` 后，所有设备都要重新输入口令。

## 7. 备份与恢复

- 自动备份：`backup.sh` 通过 SQLite 在线备份 API（等同 `sqlite3 .backup`）生成一致的快照，服务不用停。备份文件是 `backups/xuexi-时间.db.gz`，保留 14 天（可用环境变量 `KEEP_DAYS` 调整），日志在 `backups/backup.log`。
- 手动备份：`cd /srv/xuexi && ./backup.sh`
- 下载到自己电脑，建议每月一次，防止服务器整机出问题：
  ```bash
  rsync -av ubuntu@服务器IP:/srv/xuexi/backups/ ./xuexi-backups/
  ```
- 还可以在轻量服务器控制台开启“快照”，有免费额度。
- 恢复：
  ```bash
  cd /srv/xuexi
  ls backups/
  ./backup.sh --restore xuexi-20260101-031700.db.gz
  ```
  恢复时会先停止 sync，把当前数据库保存为 `/data/xuexi.db.before-restore`，再用备份替换，然后启动 sync。

## 8. 常用命令（在 /srv/xuexi 下执行）

```bash
docker compose ps                 # 状态，两个容器都应该是 healthy
docker compose logs -f sync       # 同步服务日志
docker compose logs -f caddy      # 访问日志、证书申请日志
docker compose restart sync
docker compose down               # 停止（数据在 sync_data 卷里，不会丢）
```

## 给内容 CLI 的接口（`pnpm content publish --target tencent`）

```bash
bash deploy/tencent/deploy.sh <siteDir>            # 日常：只上传站点
bash deploy/tencent/deploy.sh --init [<siteDir>]   # 第一次部署或更新服务端
```

- 环境变量：
  - `TENCENT_HOST`（必填）
  - `TENCENT_SSH_KEY`、`TENCENT_SSH_PORT`、`TENCENT_REMOTE_DIR`（可选，默认 `/srv/xuexi`）
  - `FAMILY_CODE`、`SITE_DOMAIN`、`TOKEN_SECRET`：只在第一次 `--init` 生成 `.env` 时使用，其中 `FAMILY_CODE` 这时必填
- 本机需要：`bash`、`ssh`、`rsync`。服务器需要：Docker（带 compose 和 buildx 插件）、`rsync`。
- `<siteDir>` 里要有 `index.html`。EdgeOne 专用的 `edge-functions/`、`edgeone.json`、`package.json` 会被自动跳过。
- 退出码非 0 表示失败。

## 缓存与跨域规则（Caddyfile）

| 路径                                                                                           | Cache-Control                         | 其他                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `/packs/*`、`/assets/*`（文件存在时）                                                          | `public, max-age=31536000, immutable` | `/packs/*` 带 `Access-Control-Allow-Origin: *`                               |
| `/`、`/index.html`、`/sw.js`、`/catalog.json`、`/manifest.webmanifest`，以及无扩展名的前端路由 | `no-cache`                            | `/catalog.json` 带 `Access-Control-Allow-Origin: *`                          |
| `/api/*`                                                                                       | `no-store`（由 sync 设置）            | CORS：任意来源，允许 `authorization`、`content-type` 请求头，`Max-Age` 86400 |

全站启用 zstd/gzip 压缩，并设置 `nosniff`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy` 安全头。找不到的课程包文件返回 404，不会回退到 `index.html`，也不会被长期缓存。

## 本地核实情况

- `docker compose -f deploy/tencent/docker-compose.yml --env-file deploy/tencent/.env.example config` 通过。
- `docker build -f apps/sync/Dockerfile .` 通过：运行镜像只有 node:22-alpine 加两个打包文件（server.mjs 约 60 KB）。缺少 `FAMILY_CODE` 时拒绝启动；配置正确时 `/api/health` 正常，容器健康检查为 healthy。
- 完整的 compose 栈（Caddy + sync）在本地跑过：缓存头、CORS、SPA 回退、缺失课程包返回 404、经 Caddy 的登录限流（第 11 次返回 429）、`SITE_DOMAIN` 为空或 IP 时走 :80、填域名时 80 端口 308 跳转到 HTTPS（`caddy adapt` 生成 :443 站点）。
- `backup.sh` 的备份、轮换删除、`--restore` 在本地栈上验证通过。
- `deploy.sh --init` 和日常 `deploy.sh <siteDir>` 对一个模拟服务器验证通过（Ubuntu 容器 + sshd + 宿主机 Docker）：`.env` 生成（含特殊字符）、构建和启动、站点两轮上传、删除旧文件、跳过 EdgeOne 文件。
- 未验证：真实的 Let's Encrypt 证书签发（需要公网域名）、真实腾讯云机器上的执行。
