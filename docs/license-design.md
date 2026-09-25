# 授权功能设计（待实现）

> 状态：方案已和家长确认要做，**尚未实现**。实现时按本文执行，第 7 节的待定项先确认。

## 1. 目标

防止安装包（APK、Mac/Windows 安装包、网页版）被转给别人后直接使用。App 必须有**绑定本机**的授权码才能进入。

| 场景 | 结果 |
|---|---|
| 把 APK / dmg / 网页转给别人 | 拦住：没有授权码打不开 |
| 把某台设备的授权码转给别人 | 拦住：授权码只对签发时的那台设备有效 |
| 伪造授权码 | 拦住：签名私钥只在家长手里，App 里只有公钥 |
| 有人拿公开的源码删掉检查后自己编译 | 拦不住：要防这个，只能把仓库改成私有（见第 7 节） |
| root 设备后修改 App 数据 | 拦不住：不是家庭场景要防的对象 |

## 2. 原理：离线签名授权码，不需要服务器

- **设备码**
  - App 第一次打开时生成 16 字节随机种子，存在 IndexedDB 的 KV 表里，键名 `licenseSeed`。
  - 用专门的种子，不复用同步用的 `deviceId`：`deviceId` 会出现在学习记录和备份文件里。
  - 设备码 = SHA-256(种子) 的前 6 字节，用 Crockford Base32 编码，显示成 `XXXXX-XXXXX`。
  - 覆盖安装升级时数据保留，设备码不变。卸载重装或清除 App 数据后会变，需要重新签发。
- **授权码**
  - 共 75 字节，编码后约 120 个字符，用于复制粘贴：

    ```
    [版本 1B = 1][设备码 6B][备用 2B][到期日 2B：2026-01-01 起的天数，0 = 永久][签名 64B]
    ```

  - 签名算法是 ECDSA P-256 / SHA-256，签的是前 11 个字节。签名用 IEEE P1363 格式（r‖s），即 Web Crypto 的原生格式。Node 签名时用 `crypto.sign('sha256', data, { key, dsaEncoding: 'ieee-p1363' })`。
  - 选 P-256 而不选 Ed25519：华为平板（HarmonyOS 4）、vivo、Mac 的内置浏览器内核对 Ed25519 的支持不确定，而 Web Crypto 对 P-256 普遍支持，也不用引第三方库。
  - 粘贴时忽略空格、横线和大小写。
- **校验**
  - 每次启动都用内置公钥 `crypto.subtle.verify` 校验签名，再比对设备码，检查是否过期。
  - 防改时间：在 KV 里记下见过的最晚时间 `licenseSeenMax`，判断是否过期时用 max(当前时间, 见过的最晚时间)。
- **公钥**：放进代码仓库（公开也没关系），所有构建都带锁。本地开发和冒烟测试可以用 `VITE_LICENSE_OFF=1` 构建出不带锁的版本。

## 3. 界面和流程

- **锁屏页**（包在 `App` 最外层，`/review` 审核页除外）：
  - 显示「🔒 本 App 需要授权」、设备码、「复制设备码」按钮。
  - 一个输入框用来粘贴授权码，旁边是「激活」按钮。
  - 出错时的提示：授权码不对、不是这台设备的、已过期。
- 激活成功后，授权码存在 KV 的 `license` 里，以后不用再输入。
- **家长模式 → 设置**：显示授权状态、到期时间和设备码。到期前 7 天在首页提醒家长。
- 适用范围：安卓、Mac、Windows、网页 / PWA 用同一套代码，都带锁。

## 4. 签发授权码

- **A. GitHub Actions「签发授权码」**（推荐，手机上就能操作）
  - 新建 `.github/workflows/license.yml`，手动触发，输入设备码、有效天数（0 = 永久）、备注。
  - 私钥放在仓库 Secret `LICENSE_PRIVATE_KEY` 里。授权码写进运行结果的 Summary。
  - 仓库是公开的，运行记录别人也能看到。但授权码绑定设备，看到也没用。备注里不要写真实姓名。
- **B. 命令行**
  - 签发：`pnpm content license issue <设备码> [--days N]`。私钥从环境变量 `LICENSE_PRIVATE_KEY` 读，或者从 `.signing/license-private.pem` 读。
  - 生成密钥对：`pnpm content license keygen`。
- **C. 在 Claude 会话中签发**：会话期间容器里有 `.signing/` 私钥时可以直接签发。

## 5. 一次性准备

1. 运行 `license keygen`：
   - 公钥写进 `packages/shared/src/license.ts`（或者 web 端的常量里）。
   - 私钥写进 `.signing/license-private.pem`。
   - 要粘贴到 GitHub 的内容写进 `.signing/license-secrets.txt`。
   - `.signing/` 已经在 `.gitignore` 里，永不提交。私钥不要发在聊天里。
2. 家长把私钥粘贴到 GitHub → Settings → Secrets and variables → Actions → `LICENSE_PRIVATE_KEY`。
3. 发布带锁的新版本。家里每台设备各签发一次，现在是华为平板、vivo 手机和 Mac。

## 6. 实现清单

- `packages/shared/src/license.ts`
  - 编码和解码授权码、Crockford Base32、到期日换算。
  - `verifyLicense(code, deviceCode, publicKey, now)`，用 Web Crypto 实现，浏览器和 Node 22 都能跑。
- `apps/web/src/lib/license.ts`
  - 管理种子和设备码、存取授权、记录见过的最晚时间。
  - `licenseState()` 返回以下几种状态之一：`ok` / `missing` / `invalid` / `wrong-device` / `expired` / `off`。
- `apps/web/src/components/LicenseGate.tsx` 实现锁屏页，并接进 `App.tsx`。设置页里加上授权状态。
- `tools/content/src/license.ts` 和 CLI：实现 `license keygen` 和 `license issue`。
- `.github/workflows/license.yml`：签发授权码的工作流。
- 测试：
  - 签发、校验的往返。
  - 改动任意一个字节后校验失败。
  - 设备不一致时失败。
  - 过期时失败。
  - 把时钟往回调时不能延长授权。
  - Base32 容错：空格、横线、大小写。
- 文档：在 `docs/guide.md` 里加「授权」一节。

## 7. 待确认（推荐做法已标出）

1. **有效期**：家里自己的设备用永久；给别人用时按需设 30 或 365 天。✅ 推荐
2. **锁的范围**：整个 App 都锁，没有授权进不去首页。✅ 推荐。另一种做法是只锁绘本和考试。
3. **仓库改成私有**：能彻底防止别人拿源码自己编译，但之后下载 APK 要登录 GitHub。建议先只上授权锁，以后再考虑改私有。

## 8. 已知限制和第二期

- 离线方案**不能远程吊销**单个授权码，只能靠有效期控制。
- 如果以后需要随时收回授权、限制设备数量，要加一个在线授权服务（可以复用 `apps/sync`）。这放在第二期做。
