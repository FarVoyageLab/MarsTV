# MarsTV

> 跨平台开源影视聚合 · Desktop · Mobile · TV · Web

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](./LICENSE.md)
[![pnpm](https://img.shields.io/badge/pnpm-10.33-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white)](https://turborepo.com/)

MarsTV 是一个开源的跨平台影视聚合客户端，用统一的界面消费多来源内容。一份代码库，四个终端：桌面、手机、电视、浏览器。

## ✨ 特性

- **四端一体** — 桌面端（Tauri）、移动端（iOS / Android）、电视端（Apple TV / Android TV）、Web 端，共享核心代码与 API 类型。
- **专为 TV 优化** — 电视端基于 `react-native-tvos` 构建，内置遥控器焦点引导（`TVFocusGuideView`）、可扫视的卡片布局。
- **豆瓣集成** — 接入豆瓣影视数据，自带"猜你喜欢"、榜单、详情页。
- **搜索与订阅** — 多源聚合搜索、剧集订阅与更新提醒。
- **现代播放器** — 基于 `hls.js` + `artplayer` 的 HLS 播放体验，Web 端部署在 Cloudflare Workers 上做边缘 SSR。
- **类型安全** — 从 `@marstv/core` 到 `@marstv/api` 到各端全链路 TypeScript。
- **主题设计系统** — Tailwind v4 + shadcn 风格组件，深色影院美学。

## 🚀 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| **Node.js** | `>= 22` |
| **pnpm** | `10.33.0`（仓库已通过 `packageManager` 字段锁定） |
| **Rust**（仅桌面端） | 最新稳定版 + Tauri v2 构建依赖 |
| **Xcode / Android Studio**（仅移动端、TV 端） | 最新版 |

### 克隆与安装

```bash
git clone https://github.com/FarVoyageLab/MarsTV.git
cd MarsTV
pnpm install
```

### 启动开发

一键启动全部 dev server：

```bash
pnpm dev
```

或按需启动单个应用：

```bash
pnpm -F @marstv/web dev        # Web (http://localhost:5173)
pnpm -F @marstv/desktop dev    # Tauri 桌面 (http://localhost:1420)
pnpm -F @marstv/desktop tauri dev  # Tauri 完整原生壳

pnpm -F @marstv/mobile start   # Expo 移动端
pnpm -F @marstv/tvos start     # Expo TV 端
```

### 电视端构建注意

TV 构建需要显式设置 `EXPO_TV=1`：

```bash
pnpm -F @marstv/tvos prebuild:tv   # 等价于 EXPO_TV=1 expo prebuild --clean
```

EAS 构建 profile `development_tv` / `preview_tv` / `production_tv` 已在 `apps/tvos/eas.json` 中配置好该环境变量。

## 📦 仓库结构

```
MarsTV/
├── apps/
│   ├── desktop/      # Tauri v2 + Vite + React Router
│   ├── mobile/       # Expo (iOS / Android) + React Navigation
│   ├── tvos/         # Expo + react-native-tvos (Apple TV / Android TV)
│   └── web/          # Vite + React Router 7 + Cloudflare Workers SSR
├── packages/
│   ├── core/         # 共享类型、CMS 适配器、存储（vitest 测试）
│   ├── api/          # 统一类型化 API 客户端与接口契约
│   ├── ui/           # 共享 React 组件（shadcn / Tailwind v4 / Base UI）
│   ├── eslint-config/    # 共享 ESLint 配置
│   └── typescript-config/ # 共享 tsconfig
├── turbo.json        # Turborepo 任务编排
└── pnpm-workspace.yaml # 含三个 catalog 命名空间
```

### pnpm catalogs

本仓库使用 **三个 catalog 命名空间** 来解决 RN 主线与 RN-TV 的版本分叉：

| Catalog | 使用方 | 说明 |
|---|---|---|
| `catalog:` | 根 / 所有包 | React 19、TypeScript、Tailwind 等共享依赖 |
| `catalog:mobile` | `apps/mobile` | 官方 React Native 0.81.5 |
| `catalog:tvos` | `apps/tvos` | RN 被 alias 为 `react-native-tvos@0.83.6-0`，Reanimated 版本也不同 |

新增依赖前请先看一眼 `pnpm-workspace.yaml`，优先从已有 catalog 引用。

## 🛠️ 开发命令

根目录（经由 Turbo 全局扇出）：

```bash
pnpm dev           # 所有应用 dev server
pnpm build         # 所有应用构建
pnpm lint          # 所有包 lint
pnpm check-types   # 全仓库类型检查
pnpm format        # Prettier 格式化（.ts .tsx .md）
```

### 工作区级命令

```bash
# 测试（目前只有 packages/core 有 vitest 单测）
pnpm -F @marstv/core test
pnpm -F @marstv/core test:watch

# Web 端
pnpm -F @marstv/web build
pnpm -F @marstv/web cf-typegen   # 编辑 wrangler.jsonc 后重新生成类型

# 桌面端
pnpm -F @marstv/desktop tauri build   # 生成原生安装包
```

### 代码风格

- **Biome** 是根级别真实的 linter + formatter（`biome.json`：tab 缩进、双引号）。
- Claude Code 已配置 PostToolUse 钩子，写入/编辑后自动运行 `pnpm biome format --write`。
- 各包内的 ESLint 配置使用 `eslint-plugin-only-warn`，只产生警告而非错误，专门处理 React / Expo 相关规则。

## 🌐 部署

| 终端 | 方式 |
|------|------|
| **Web** | Cloudflare Workers（`wrangler deploy`，worker 名 `marstv-web`） |
| **tvOS** | EAS（`pnpm -F @marstv/tvos deploy`） |
| **Desktop** | Tauri 原生包（`pnpm -F @marstv/desktop tauri build`） |
| **Mobile** | Expo / EAS |

Web 端预览 URL 形如：`https://marstv-web.<your-cf-account>.workers.dev`。

## 🤝 贡献

欢迎提 Issue 和 PR。提交前：

```bash
pnpm check-types
pnpm lint
pnpm -F @marstv/core test
```

Commit 风格遵循约定式提交（Conventional Commits），推荐 `feat:` / `fix:` / `refactor:` / `chore:` / `docs:` / `style:` 等前缀。

## 📜 许可

本项目采用 **CC BY-NC-SA 4.0** 许可协议 — 允许个人与开源非商业用途下的使用、修改和再分发，但必须署名、禁止商业用途且衍生作品需采用相同协议。详见 [LICENSE.md](./LICENSE.md)。

> ⚠️ **声明**：本项目仅用于技术学习与交流。所聚合的影视内容版权归原平台与版权方所有，项目本身不托管、不提供任何影视资源。使用者应遵守所在地区的法律法规。

## 🔗 相关链接

- [Tauri v2](https://v2.tauri.app/) · [Expo](https://expo.dev/) · [react-native-tvos](https://github.com/react-native-tvos/react-native-tvos)
- [React Router 7](https://reactrouter.com/) · [Cloudflare Workers](https://workers.cloudflare.com/)
- [Turborepo](https://turborepo.com/) · [pnpm Catalogs](https://pnpm.io/catalogs)
- [Biome](https://biomejs.dev/) · [Tailwind CSS v4](https://tailwindcss.com/)
