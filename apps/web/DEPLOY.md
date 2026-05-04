# 部署到 Cloudflare Workers

本文档描述 `@marstv/web` 部署到 Cloudflare Workers 的完整流程与踩坑点。

## 部署架构

```
GitHub Push → Cloudflare Workers Builds (dashboard-driven)
                    │
                    ▼
pnpm run build:cf
  ├─ tsc -b && vite build
  │    └─ @cloudflare/vite-plugin 生成
  │       dist/marstv_web/wrangler.json
  └─ node scripts/inject-kv-id.mjs
       └─ 把占位符 KV id 替换成真实 id(来自 env var)
                    │
                    ▼
wrangler deploy --keep-vars
  (读 dist/marstv_web/wrangler.json,不是源文件)
```

## 两份 wrangler 配置的区别

| 文件 | 作用 | 是否提交 git |
|---|---|---|
| `wrangler.jsonc` | 源配置,KV id 是占位符 `0123...abcdef` | ✅ 提交 |
| `dist/marstv_web/wrangler.json` | 构建产物,`wrangler deploy` 实际读的那份 | ❌ gitignored |

**关键点**:`@cloudflare/vite-plugin` 在构建时把 `.jsonc` 转成 `.json` 并写到 dist,`wrangler deploy` 只看 dist 里的那份。所以只要在 `vite build` 之后、`wrangler deploy` 之前打补丁就行 —— 这就是 `scripts/inject-kv-id.mjs` 的时机。

## Cloudflare Dashboard 配置清单

### 1. 构建配置

- **根目录**: `apps/web`
- **构建命令**: `pnpm run build:cf`
- **部署命令**: `npx wrangler deploy --keep-vars`
  - `--keep-vars` 保护 dashboard 设置的 vars/secrets 不被覆盖

### 2. ⚠️ 变量位置对照(极易踩坑)

CF dashboard 上有**两个**叫"变量和机密"的分区,看起来一样但作用完全不同:

| 分区位置 | 用途 | 示例 |
|---|---|---|
| 页面顶部「变量和机密」 | **Worker 运行时** env — 只有 Worker 代码里的 `env.XXX` 能读到 | `ADMIN_PASSWORD`、`SESSION_SECRET` |
| 「构建」分区下嵌套的「变量和机密」 | **构建时** env — 只有 `build:cf` 脚本里的 Node 进程能读到 | `MARSTV_CMS_KV_ID` |

**判断规则**:

- 这个值是 `wrangler.json` / 构建脚本要用的?→ **构建变量**
- 这个值是 Worker 响应请求时要读的?→ **运行时变量**
- 两者都要?→ 两边都配(绝大多数情况不需要)

### 3. 当前生产配置

**运行时(顶部 Variables and Secrets)**

- `ADMIN_PASSWORD`(密钥) — `/config` 管理页登录
- `SESSION_SECRET`(密钥) — HMAC cookie 签名,32+ 字节随机串
- `PROXY_SECRET`(密钥,可选) — m3u8 代理签名

**构建时(Build → Variables and Secrets)**

- `MARSTV_CMS_KV_ID`(纯文本) — KV namespace id,32 位十六进制

## KV 绑定的特殊性

**为什么不能用 dashboard 直接绑 KV,非要走环境变量?**

- `wrangler deploy --keep-vars` 只保护 `vars` 和 `secrets`,**不保护资源绑定**(KV / R2 / D1 / Queues 等)
- 每次部署 wrangler 都会把远端资源绑定**完全重写**成本地配置
- 所以如果 `wrangler.json` 里写的是占位符 id,部署后 KV 绑定就变成指向占位符 → `KV namespace not found [10041]`

**解决方案:构建期注入**

- 源码里保留占位符 → 任何人 fork 后都能本地构建
- 部署时真实 id 从构建变量注入 → 不进 git
- `--keep-vars` 保留 dashboard 的 secrets → secrets 不被覆盖

## 首次部署步骤

```bash
# 1. 创建 KV namespace(在 CF dashboard 或用 wrangler)
pnpm -F @marstv/web wrangler kv namespace create MARSTV_CMS
# 记下返回的 id,形如 e25574a409a54e23bdeb8a3c6374b987

# 2. 在 Workers & Pages → 你的 Worker → 设置 中配置:
#    构建 → 变量和机密:
#      MARSTV_CMS_KV_ID = <上面的 id>(纯文本)
#    顶部 变量和机密:
#      ADMIN_PASSWORD = <你的密码>(密钥)
#      SESSION_SECRET = <随机 32+ 字节>(密钥)

# 3. 触发部署(push 到 main 或 dashboard 点 Deploy)
```

## 修改配置后的流程

| 改动 | 需要做什么 |
|---|---|
| 改 `wrangler.jsonc` | `pnpm -F @marstv/web cf-typegen` 更新 `worker-configuration.d.ts` |
| 加新的 KV / R2 / D1 绑定 | 同样套路:`.jsonc` 里写占位符,扩展 `inject-kv-id.mjs` 的替换逻辑 |
| 加新的构建期秘密 | Dashboard → 构建 → 变量和机密 → 添加 |
| 加新的运行时秘密 | Dashboard → 顶部变量和机密 → 添加(类型选密钥)|

## 常见报错速查

| 报错 | 原因 | 修复 |
|---|---|---|
| `Missing script: build:cf` | `package.json` 没有这个脚本 | 检查是否在 `apps/web/package.json` 里 |
| `KV namespace '0123...' not found [10041]` | 占位符没被替换 | 检查构建变量 `MARSTV_CMS_KV_ID` 是否配在**构建**分区 |
| `[inject-kv-id] MARSTV_CMS_KV_ID not set` | 变量配到了运行时分区,构建脚本读不到 | 移到「构建 → 变量和机密」 |
| `[inject-kv-id] placeholder not found` | 脚本已经跑过 / vite-plugin 换了输出路径 | 检查 `CONFIG_PATH` 常量 |
| Worker 部署后 secrets 消失 | 没加 `--keep-vars` | 部署命令改成 `wrangler deploy --keep-vars` |

## 核心原则

记住这三条就够了:

1. **占位符 in git,真值 in dashboard** —— 源码任何人能构建,敏感值不泄漏
2. **构建时 vs 运行时是两个世界** —— 不是同一个 env 变量池,别搞混
3. **`--keep-vars` 只保 vars/secrets,不保资源绑定** —— 资源 id 必须在每次部署时都正确
