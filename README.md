# GitHub Manager

> 一站式管理你的 GitHub Stars、Pull Requests、Issues —— 支持本地标签备注、Lists 分类、Release 订阅，以及可选的 AI 智能分析功能。

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/shadcn/ui-Components-000?logo=shadcnui" alt="shadcn/ui">
</p>

## 功能特性

### Stars 管理

提供灵活的 Star 仓库浏览体验，支持卡片和列表两种视图模式。内置强大的搜索过滤功能，可按编程语言筛选、多维度排序（Star 数、更新时间、创建时间等），并支持批量操作以提升管理效率。

### Pull Requests 与 Issues

集中展示你参与的所有 PR 和 Issue，支持按来源类型（自己创建的 / 参与讨论的）和状态（Open / Closed / Merged）进行过滤。全文搜索功能帮助你快速定位目标内容。

### GitHub Lists 集成

无缝对接 GitHub 原生 Lists 功能，让你可以将 Star 的仓库按主题、用途或任何你喜欢的方式进行分类整理，所有操作直接同步到 GitHub。

### 本地标签与备注

为任意仓库添加自定义标签（支持自定义颜色）和个人备注。这些数据存储在浏览器本地，不会上传到任何服务器，完全保护你的隐私。适合记录项目评价、使用心得或待办事项。

### Release 订阅

订阅你关注的仓库 Release 更新，所有动态以时间线形式聚合展示。再也不用担心错过重要版本发布，轻松掌握依赖库的更新节奏。

### AI 智能分析（可选）

集成 AI 能力，提供仓库自动分类建议、智能标签推荐、项目内容总结以及语义搜索功能。需要配置兼容 OpenAI 接口的 AI 服务商。

## 快速开始

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/github-manager)

部署说明：

- 直接将仓库导入 Vercel 即可完成部署，零配置开箱即用
- 项目已预配置 `pnpm` 包管理器和 SPA 路由回退规则
- 无需在 Vercel 后台设置任何环境变量 —— GitHub Token 和 AI Key 均由用户在前端界面配置，数据保存在浏览器本地存储中

### 本地开发

**纯前端开发模式**（不启用 `/api/*` 后端接口）：

```bash
pnpm install
pnpm dev
# 访问 http://localhost:8081
```

**完整联调模式**（包含 AI API 后端函数）：

```bash
npm i -g vercel
vercel dev
```

## 认证配置

### GitHub Token

本项目使用 [Personal Access Token (PAT)](https://github.com/settings/tokens) 进行身份认证。为遵循最小权限原则，建议仅授予以下权限：

| 权限 | 用途 |
|------|------|
| `read:user` | 读取用户基本信息 |
| `repo` | 访问私有仓库、Stars 列表、GitHub Lists |

**隐私说明：** Token 仅保存在浏览器 `localStorage` 中，不会上传至任何服务端。所有 GitHub API 请求均由浏览器直接发起。

### AI 服务配置（可选）

如需使用 AI 智能分析功能，请在应用内进入 **设置** → **AI 服务配置** 进行设置。

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| Base URL | OpenAI 兼容的 API 端点地址 | `https://api.openai.com/v1` |
| API Key | 服务商提供的访问密钥 | `sk-...` |
| Model | 指定使用的模型名称 | `gpt-4o`、`gpt-3.5-turbo` |

**支持的服务商：** 任何兼容 OpenAI API 格式的服务均可使用，包括 OpenAI 官方、Azure OpenAI、各类国产大模型 API 等。

**相关 API 端点：**

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/test-ai-connection` | POST | 测试 AI 服务连通性 |
| `/api/analyze-repos` | POST | 批量分析仓库内容 |
| `/api/ai-search` | POST | 基于语义的智能搜索 |

**安全说明：** AI Key 仅在触发 AI 功能时发送到你自己部署的 `/api/*` 后端函数，再由服务端转发到 AI Provider。服务端不会持久化存储任何密钥信息。

## 技术栈

| 类别 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 6 |
| UI 组件库 | shadcn/ui + Radix UI |
| 样式方案 | Tailwind CSS 3 |
| 数据可视化 | Recharts |
| 后端服务 | Vercel Serverless Functions |
| 单元测试 | Vitest |

## 常见问题

### 安装依赖时报 `ENOTFOUND registry.npmmirror.com`

这通常是因为本机将 npm/pnpm registry 指向了国内镜像站，但当前网络环境无法访问该镜像。可以临时切换到官方源：

```bash
pnpm config set registry https://registry.npmjs.org/
```

### 部署后访问子路由返回 404

项目已在 `vercel.json` 中配置了 SPA 路由回退规则，正常部署到 Vercel 不会出现此问题。

如果你使用其他托管平台（如 Netlify、Cloudflare Pages 等），请确保配置了相应的 `index.html` 回退规则，将所有未匹配的路由重定向到入口文件。

### 如何清除本地数据

所有用户数据（Token、标签、备注、AI 配置等）均存储在浏览器 `localStorage` 中。如需清除：

1. 打开浏览器开发者工具（F12）
2. 切换到 Application / Storage 面板
3. 在 Local Storage 中删除对应域名下的数据

或者直接在应用的设置页面中使用「清除数据」功能。

## License

[MIT](./LICENSE)
