# GitHub Manager 任务清单（修订版）

> 用途：按优先级执行，确保每项都可验证、可回滚
> 修订日期：2026-02-08

---

## 状态标记

- `[ ]` 待完成
- `[-]` 进行中
- `[x]` 已完成
- `[!]` 阻塞

---

## P0：安全边界（先做）

- [x] **1.1** 锁定认证/密钥策略（纯前端模式 or BFF）
  - 文件：`docs/ANALYSIS-REPORT.md`、`README.md`
  - 描述：明确“接受的风险”与“不做项”，统一文档口径
  - 验证：README 与实际实现一致，不再互相冲突

- [x] **1.2** Provider `baseUrl` 统一校验
  - 文件：`api/_utils.ts`
  - 文件：`api/analyze-repos.ts`
  - 文件：`api/analyze-stream.ts`
  - 文件：`api/ai-search.ts`
  - 文件：`api/test-ai-connection.ts`
  - 描述：仅允许公网 `https`，拒绝 localhost/内网/保留网段
  - 验证：非法 URL 返回 400，合法 URL 可调用

- [x] **1.3** CORS 白名单化
  - 文件：`api/_utils.ts`
  - 描述：生产环境不再使用 `*`，改为 `ALLOWED_ORIGINS`
  - 验证：白名单外来源跨域失败，白名单内成功

- [x] **1.4** 安全说明同步更新
  - 文件：`README.md`
  - 描述：修正 localStorage/sessionStorage 的安全表述，增加 AI 转发边界说明
  - 验证：文档不含与实现冲突的描述

---

## P1：性能与一致性（高优）

- [x] **2.1** 路由代码分割
  - 文件：`src/App.tsx`
  - 新建：`src/components/common/PageLoading.tsx`（可选）
  - 描述：页面级懒加载，保持路由兼容（`/pulls`）
  - 验证：构建后有页面 chunk，首屏请求减少

- [x] **2.2** 统一 Query 缓存策略（Stars/PRs/Issues）
  - 文件：`src/hooks/api/useStars.ts`
  - 文件：`src/hooks/api/usePullRequests.ts`
  - 文件：`src/hooks/api/useIssues.ts`
  - 描述：`staleTime + gcTime + refetchOnWindowFocus/refetchOnReconnect`
  - 验证：切回标签页/断网恢复后触发再验证

- [x] **2.3** 搜索防抖
  - 新建：`src/hooks/useDebounce.ts`
  - 文件：`src/components/stars/StarsSearchBar.tsx`
  - 文件：`src/pages/Issues.tsx`
  - 描述：300ms 防抖，降低频繁重算
  - 验证：快速输入时过滤逻辑不会每键触发

- [x] **2.4** PWA 定时器防重复
  - 文件：`src/lib/pwa.ts`
  - 描述：定时器可清理，避免 HMR 重复注册
  - 验证：热更新后无定时器累积

---

## P2：可用性与体验（次优）

- [x] **3.1** 错误态支持重试
  - 文件：`src/components/stars/StarsDashboard.tsx`
  - 文件：`src/pages/Issues.tsx`
  - 文件：`src/pages/Dashboard.tsx`
  - 描述：错误场景提供显式重试动作
  - 验证：断网/失败后可点击重试恢复

- [x] **3.2** a11y 关键项补齐
  - 文件：`src/components/stars/RepoCard.tsx`
  - 文件：`src/components/stars/VirtualStarsList.tsx`
  - 文件：`src/components/ThemeToggle.tsx`
  - 文件：`src/components/layout/Header.tsx`
  - 描述：补齐 ARIA、状态提示、焦点稳定性
  - 验证：axe 关键告警减少

- [x] **3.3** 骨架屏与 CLS 优化（可选）
  - 新建：`src/components/common/SkeletonLoading.tsx`
  - 文件：`src/pages/Dashboard.tsx`
  - 文件：`src/pages/Repos.tsx`
  - 文件：`src/pages/Issues.tsx`
  - 描述：加载态保持布局稳定
  - 验证：CLS 指标改善

---

## 持续治理（并行）

- [x] **4.1** TS 严格模式第一步：`noUnusedLocals` / `noUnusedParameters`
  - 文件：`tsconfig.app.json`
  - 验证：`pnpm tsc --noEmit` 通过

- [x] **4.2** TS 严格模式第二步：`noImplicitAny`
  - 文件：`tsconfig.app.json`
  - 验证：`pnpm tsc --noEmit` 通过

- [x] **4.3** TS 严格模式第三步：`strict` / `strictNullChecks`
  - 文件：`tsconfig.app.json`
  - 验证：`pnpm tsc --noEmit` 通过

- [x] **4.4** AI 缓存容量与 LRU
  - 文件：`src/lib/ai-analysis-cache.ts`
  - 描述：在 TTL 基础上增加容量治理
  - 验证：超限自动驱逐，缓存读写正常

---

## 依赖关系

- `1.1` -> `1.4`（先锁定安全模型再更新说明）
- `2.1` 独立，可与 `2.2` 并行
- `2.2` 建议一次覆盖 Stars/PRs/Issues，避免行为分裂
- `4.1` -> `4.2` -> `4.3`（必须顺序推进）

---

## 通用验证命令

```bash
pnpm tsc --noEmit
pnpm build
pnpm test
```
