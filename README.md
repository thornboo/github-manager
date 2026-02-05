# GitHub Manager

一个用于管理你 GitHub Stars / PR / Issues 的前端应用：支持本地标签与备注、GitHub Lists 分类、Release 订阅跟踪；并提供可选的 AI 仓库分析与语义搜索能力（通过 Vercel `/api/*` 转发到你配置的 AI Provider）。

## 功能

- Stars：卡片/列表视图、搜索、语言筛选、排序、批量选择
- PR / Issues：按来源（创建/参与）与状态过滤，支持搜索
- GitHub Lists：使用 GitHub 原生 Lists 对 Stars 分类整理
- 本地标签 & 备注：为仓库创建自定义标签/颜色，并写入个人备注（存储在浏览器本地）
- Release 跟踪：订阅仓库 Release，聚合时间线展示
- AI（可选）：仓库分类建议/标签建议/总结；语义搜索（需要你配置 AI Provider）

## 一键部署到 Vercel

- 直接把仓库导入 Vercel 即可（Vite 项目，输出目录 `dist`）。
- 项目使用 pnpm（已包含 `pnpm-lock.yaml`，并在 `package.json` 指定 `packageManager`），Vercel 会自动选择 pnpm 构建。
- 本项目包含 `vercel.json`，已配置 SPA 刷新路由回退，不会因直接访问 `/dashboard`、`/repos` 等路径而 404。
- 默认不需要任何环境变量（Token/Key 均由用户在前端配置并保存在浏览器本地）。

## 本地开发

### 仅前端（不启用本地 `/api/*`）

```bash
pnpm install
pnpm dev
```

默认端口：`http://localhost:8080`

> 说明：Stars/PR/Issues/Release 等数据直接由浏览器调用 GitHub API 获取；本地标签/备注存储在浏览器 `localStorage`。

### 完整联调（包含本地 `/api/*`，AI 可用）

需要安装 Vercel CLI（并登录一次）：

```bash
npm i -g vercel
vercel dev
```

## 登录（GitHub Token）

使用 GitHub Personal Access Token（PAT）登录并拉取数据。

建议最少权限：
- `read:user`
- `repo`（如果你需要读取私有仓库相关数据/Stars/Lists）

> 提示：Token 只保存在你的浏览器本地（`localStorage`），不会写入服务端数据库。

## AI 配置说明

AI 功能通过你部署的 Vercel Function 转发到你填写的 Provider（OpenAI 兼容的 `/v1/chat/completions`）。

- 配置入口：页面「设置」->「AI 服务配置」
- Base URL 示例：`https://api.openai.com/v1`（或兼容 OpenAI 协议的服务地址）
- API Key / Model：按服务商要求填写

相关接口（同域）：
- `POST /api/test-ai-connection`：测试 Provider 连通性
- `POST /api/analyze-repos`：批量分析仓库（分类/标签/总结）
- `POST /api/ai-search`：语义搜索

安全提示：
- AI Key 会在你触发 AI 功能时从浏览器发送到你自己的 `/api/*`，再由服务端转发到 Provider；服务端不持久化保存 Key。
- 建议只在可信环境使用，并避免在共享设备上保存 Token/Key。

## 常见问题

### 安装依赖时报 `ENOTFOUND registry.npmmirror.com`

你的本机可能把 npm/pnpm registry 指向了镜像站，但当前网络无法访问。可以临时切到官方源：

```bash
pnpm config set registry https://registry.npmjs.org/
```
