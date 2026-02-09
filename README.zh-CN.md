<div align="center">

[English](./README.md) | **简体中文**

# GitHub Manager

**一站式管理你的 GitHub Stars、Pull Requests、Issues 与 Release 订阅**

本地标签备注 · Lists 分类 · 智能 AI 分析 · 完全隐私保护

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Components-000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-在线体验-28a745?logo=vercel&logoColor=white)](https://github-manager-ten.vercel.app)

[在线体验](https://github-manager-ten.vercel.app) · [功能特性](#功能特性) · [快速开始](#快速开始) · [配置说明](#配置说明) · [常见问题](#常见问题)

</div>

---

## 功能特性

<table>
<tr>
<td width="50%">

### Stars 管理

卡片/列表双视图 · 语言筛选 · 多维排序
虚拟滚动支持海量仓库 · 批量操作

</td>
<td width="50%">

### 本地标签与备注

自定义彩色标签 · 个人笔记
数据存储在浏览器，**完全隐私**

</td>
</tr>
<tr>
<td width="50%">

### GitHub Lists 集成

无缝同步 GitHub 原生 Lists
按主题/用途灵活分类管理

</td>
<td width="50%">

### Release 订阅

时间线聚合展示版本动态
再也不错过重要更新

</td>
</tr>
<tr>
<td width="50%">

### PR & Issues 中心

集中展示参与的所有 PR/Issue
状态过滤 · 全文搜索

</td>
<td width="50%">

### AI 智能分析 <sup>可选</sup>

自动分类建议 · 标签推荐
项目摘要 · 语义搜索

</td>
</tr>
</table>

---

## 界面预览

<table>
<tr>
<td width="50%">
<img src="./docs/screenshots/dashboard.png" alt="仪表板" />
<p align="center"><b>仪表板</b> - 数据概览与快速访问</p>
</td>
<td width="50%">
<img src="./docs/screenshots/stars-grid.png" alt="Stars 管理" />
<p align="center"><b>Stars 管理</b> - 卡片视图与本地标签</p>
</td>
</tr>
<tr>
<td width="50%">
<img src="./docs/screenshots/ai-analysis.png" alt="AI 分析" />
<p align="center"><b>AI 分析</b> - 智能分类与标签推荐</p>
</td>
<td width="50%">
<img src="./docs/screenshots/dark-mode.png" alt="深色主题" />
<p align="center"><b>深色主题</b> - 护眼模式</p>
</td>
</tr>
</table>

---

## 快速开始

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thornboo/github-manager)

> **零配置开箱即用** — GitHub Token 和 AI Key 由用户在前端界面配置，数据保存在浏览器本地。

### 本地开发

```bash
# 安装依赖
pnpm install

# 前端开发模式
pnpm dev
# → http://localhost:8081

# 完整联调（含 AI API）
npm i -g vercel && vercel dev
```

---

## 配置说明

### GitHub Token

前往 [GitHub Settings → Tokens](https://github.com/settings/tokens) 创建 Personal Access Token：

| 权限        | 用途                          |
| ----------- | ----------------------------- |
| `read:user` | 读取用户基本信息              |
| `repo`      | 访问仓库、Stars、GitHub Lists |

> **隐私说明**：Token 仅存储在浏览器 `localStorage`，API 请求由浏览器直连 GitHub。

### AI 服务 <sup>可选</sup>

在应用 **设置 → AI 服务配置** 中填写：

| 配置项   | 说明                                            |
| -------- | ----------------------------------------------- |
| Base URL | OpenAI 兼容端点，如 `https://api.openai.com/v1` |
| API Key  | 服务商密钥                                      |
| Model    | 模型名称，如 `gpt-4o`                           |

支持 OpenAI、Azure OpenAI 及所有兼容接口的国产大模型。

---

## 常见问题

<details>
<summary><b>安装依赖报错 ENOTFOUND registry.npmmirror.com</b></summary>

切换到官方源：

```bash
pnpm config set registry https://registry.npmjs.org/
```

</details>

<details>
<summary><b>其他平台部署后子路由 404</b></summary>

配置 SPA 路由回退规则，将未匹配路由重定向到 `index.html`。Vercel 已在 `vercel.json` 中预配置。

</details>

<details>
<summary><b>如何清除本地数据</b></summary>

方式一：应用内 **设置 → 清除数据**
方式二：浏览器 DevTools → Application → Local Storage → 删除对应域名数据

</details>

---

## 安全架构

采用 **纯前端受信终端模式**：

- GitHub Token / AI Key 仅存储于浏览器本地
- GitHub API 由浏览器直连，不经过后端
- AI 请求通过同源 `/api/*` 无状态转发，服务端不持久化密钥
- 支持配置 `ALLOWED_ORIGINS` 限制 API 调用来源

> 请使用最小权限 Token，并仅在受信任环境下使用。如需企业级安全方案，建议演进到 BFF 模式。

---

## 技术栈

| 前端                    | 后端               | 工具链                     |
| ----------------------- | ------------------ | -------------------------- |
| React 18 · TypeScript 5 | Vercel Serverless  | Vitest · ESLint · Prettier |
| Vite 5 · Tailwind CSS 3 | GitHub GraphQL API | pnpm · PWA                 |
| shadcn/ui · Radix UI    | OpenAI 兼容接口    | React Query                |

---

## License

[MIT](./LICENSE) © 2026 thornboo
