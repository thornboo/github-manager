/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

// 让激活后的 SW 尽快接管页面；更新是否跳过 waiting 由客户端触发（SKIP_WAITING）控制。
clientsClaim();

// 预缓存静态资源（由 vite-plugin-pwa/workbox 在构建时注入清单）
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ==================== 运行时缓存策略 ====================

// Background Sync：仅对明确标记的“同步类”请求启用，避免误缓存/误重放。
const bgSyncPlugin = new BackgroundSyncPlugin("sync-queue", {
  maxRetentionTime: 24 * 60, // minutes (24h)
});

// /api/***sync***：离线时排队，在线后重放
registerRoute(
  ({ url, request }) =>
    request.method === "POST" &&
    url.origin === self.location.origin &&
    url.pathname.startsWith("/api/") &&
    url.pathname.includes("sync"),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  "POST",
);

// 注意：GitHub GraphQL API 默认使用 POST，请求响应无法使用 Cache API 写入缓存；
// 因此离线数据主要依赖应用层（localStorage / React Query）缓存。

// GitHub REST API - Stale While Revalidate
registerRoute(
  ({ url }) =>
    url.origin === "https://api.github.com" && url.pathname !== "/graphql",
  new StaleWhileRevalidate({
    cacheName: "github-api-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24, // 1 天
      }),
    ],
  }),
);

// GitHub 头像 - Cache First
registerRoute(
  ({ url }) => url.origin === "https://avatars.githubusercontent.com",
  new CacheFirst({
    cacheName: "github-avatars-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
      }),
    ],
  }),
);

// 自建 /api - Network Only（不缓存敏感数据）
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.startsWith("/api/"),
  new NetworkOnly(),
);

// ==================== 离线回退（SPA） ====================

// 断网刷新/直达任意路由时，回退到预缓存的 index.html（由 React Router 接管路由）。
const navigationHandler = createHandlerBoundToURL("/index.html");
registerRoute(({ request }) => request.mode === "navigate", navigationHandler);

// ==================== 消息处理 ====================

self.addEventListener("message", (event) => {
  const data = event.data as
    | { type: "SKIP_WAITING" }
    | { type: "CACHE_URLS"; payload: string[] }
    | { type: "CLEAR_CACHE"; payload: string }
    | undefined;

  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_URLS") {
    const urls = Array.isArray(data.payload) ? data.payload : [];
    event.waitUntil(
      caches.open("manual-cache-v1").then((cache) => cache.addAll(urls)),
    );
    return;
  }

  if (data.type === "CLEAR_CACHE") {
    const cacheName = data.payload;
    event.waitUntil(caches.delete(cacheName));
  }
});

// ==================== 推送通知（可选） ====================

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json() as {
    title?: string;
    body?: string;
    url?: string;
  };

  const title = payload.title || "GitHub Manager";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: "/pwa-192x192.png",
    badge: "/badge-72x72.png",
    data: { url: payload.url || "/" },
    actions: [
      { action: "open", title: "查看" },
      { action: "dismiss", title: "忽略" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url =
    (event.notification.data as { url?: string } | undefined)?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
