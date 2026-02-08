# GitHub Manager 修复计划（修订版）

> 目标：把“问题清单”升级为可落地执行计划
> 修订日期：2026-02-08

---

## 0. 执行原则

1. **先决策，后改造**：安全模型先定，再动存储与认证。
2. **先边界，后体验**：先处理安全边界与数据一致性，再做 UX 打磨。
3. **小步可回滚**：每个阶段都可独立上线与回退。
4. **统一口径**：文档、代码、路由、配置保持一致（避免 `/pulls` / `/pull-requests` 这类偏差）。

---

## 第一阶段：安全边界与决策锁定（P0，预计 1-2 天）

### 任务 1.1：锁定认证/密钥产品策略（决策项）

**为什么先做**

- `localStorage` 与 `sessionStorage` 在 XSS 场景下都可被读取。
- 这是产品架构选择，不是单点“修 bug”。

**选项**

- **A. 纯前端模式（保持当前定位）**
  - Token / AI Key 继续本地存储。
  - 重点做 CSP、输入校验、风险提示、最小暴露面。
- **B. BFF 模式（安全优先）**
  - 服务端持有敏感密钥，浏览器仅持 `HttpOnly` 会话。
  - 成本更高，涉及较大重构。

**交付物（DoD）**

- 在文档中明确选型与不做项（YAGNI）。
- README 安全说明与实际实现一致。

**当前结论（2026-02-09）**

- 采用 A 方案：纯前端受信终端模式（非 BFF）。
- 本迭代不引入服务端托管密钥与 `HttpOnly` 会话。

---

### 任务 1.2：AI Provider `baseUrl` 边界校验（必做）

**问题**

- `api/analyze-repos.ts`、`api/analyze-stream.ts`、`api/ai-search.ts`、`api/test-ai-connection.ts` 会直接请求用户输入的 `baseUrl`。

**改动建议**

- 在 `api/_utils.ts` 增加统一校验函数，例如 `validateProviderBaseUrl`：
  - 仅允许 `https:`
  - 拒绝 `localhost` / `127.0.0.1` / `::1`
  - 拒绝常见内网网段（10/8, 172.16/12, 192.168/16, 169.254/16, fc00::/7）
  - 禁止空主机、非法 URL
- 四个 AI API 入口统一调用校验函数，失败返回 400。

**DoD**

- 非法 `baseUrl` 请求均被拒绝。
- 合法公网 `https` 地址可正常通过。

**回滚策略**

- 通过开关（如环境变量）暂时放宽校验，避免误拦截导致生产中断。

---

### 任务 1.3：CORS 策略收敛（必做）

**问题**

- 当前 `api/_utils.ts` 使用 `Access-Control-Allow-Origin: *`。

**改动建议**

- 增加环境变量 `ALLOWED_ORIGINS`（逗号分隔）。
- 开发环境可保留宽松策略；生产环境必须命中白名单。
- `OPTIONS` 与业务响应保持同一套 CORS 逻辑。

**DoD**

- 白名单外来源无法跨域调用 AI API。
- 预检请求通过，合法来源业务请求正常。

---

## 第二阶段：性能与数据一致性（P1，预计 2-4 天）

### 任务 2.1：路由代码分割（保持路由兼容）

**文件**：`src/App.tsx`（可新增 `src/components/common/PageLoading.tsx`）

**改动建议**

- 仅保留登录入口页同步加载，其余页面用 `React.lazy` + `Suspense`。
- 路由路径保持当前实现：`/pulls`（不要改成 `/pull-requests`）。

**DoD**

- 构建后产出页面级 chunk。
- 访问首屏时非必要页面 chunk 不加载。

---

### 任务 2.2：统一 Query 缓存策略（Stars/PRs/Issues）

**文件**：

- `src/hooks/api/useStars.ts`
- `src/hooks/api/usePullRequests.ts`
- `src/hooks/api/useIssues.ts`

**改动建议（React Query v5）**

- `staleTime`: 5 分钟
- `gcTime`: 30 分钟（注意不是 `cacheTime`）
- `refetchOnWindowFocus`: `true`
- `refetchOnReconnect`: `true`
- `refetchOnMount`: `false`（保留快开体验）

**DoD**

- 三类数据行为一致。
- 标签页切回、网络恢复后会进行数据再验证。

---

### 任务 2.3：搜索防抖（先解决高频输入路径）

**优先路径**

- Stars 搜索：`src/components/stars/StarsSearchBar.tsx`
- Issues 搜索：`src/pages/Issues.tsx`

**改动建议**

- 新增 `src/hooks/useDebounce.ts`（300ms 默认）。
- 仅在用户停止输入后更新过滤关键词。

**DoD**

- 快速输入时明显减少过滤计算与重渲染。

---

### 任务 2.4：PWA 定时器防重复注册

**文件**：`src/lib/pwa.ts`

**改动建议**

- 记录 interval id，重复初始化前先清理。
- 在 HMR 场景下通过 `import.meta.hot?.dispose` 清理定时器（若适用）。

**DoD**

- 多次热更新后不会累积更新定时器。

---

## 第三阶段：UX / a11y（P2，预计 2-3 天）

### 任务 3.1：错误态可恢复（重试）

**文件**：

- `src/components/stars/StarsDashboard.tsx`
- `src/pages/Issues.tsx`
- `src/pages/Dashboard.tsx`（按实际加载逻辑评估）

**说明**

- `EmptyState` 已具备 `action` 能力，无需重做组件抽象。

**DoD**

- 网络错误场景下可一键重试，无需手动刷新页面。

---

### 任务 3.2：a11y 补齐

**文件**：

- `src/components/stars/RepoCard.tsx`
- `src/components/stars/VirtualStarsList.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/layout/Header.tsx`

**改动建议**

- 优先补 ARIA 与可感知状态信息。
- 对虚拟列表焦点管理做稳健化改造，避免“偶发焦点丢失”。

**DoD**

- axe DevTools 关键告警显著减少。

---

### 任务 3.3：骨架屏与 CLS 优化（可选）

**说明**

- 属于体验增强，不应阻塞 P0/P1。

---

## 第四阶段：质量治理（并行推进）

### 任务 4.1：TypeScript 严格模式渐进启用

**步骤建议**

1. `noUnusedLocals` + `noUnusedParameters`
2. `noImplicitAny`
3. `strict` + `strictNullChecks`

**执行要求**

- 每一步先统计错误基线，再逐步清零。
- CI 以“当前阶段门禁”为准，避免一次性全开。

---

### 任务 4.2：AI 缓存容量治理

**文件**：`src/lib/ai-analysis-cache.ts`

**建议**

- 保留当前 TTL 机制。
- 增加条目上限与 LRU 驱逐。
- 对 `QuotaExceededError` 做可观测处理（日志/提示）。

---

## 验证清单（每阶段结束执行）

```bash
# 类型检查
pnpm tsc --noEmit

# 构建检查
pnpm build

# 单元测试
pnpm test
```

---

## 风险与回滚

- **安全校验误伤**：通过配置开关临时放宽，优先保可用性。
- **缓存策略变更导致请求增加**：先在小范围验证，再全量启用。
- **懒加载引入白屏**：保留统一 `fallback`，并保持登录页同步加载。

---

## 相关文档

- 分析报告：`./ANALYSIS-REPORT.md`
- 执行清单：`./TASK-CHECKLIST.md`
