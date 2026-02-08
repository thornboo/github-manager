import { registerSW } from "virtual:pwa-register";

export interface PWAInitOptions {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: unknown) => void;
}

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let updateSWFunction: (() => Promise<void>) | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let didInit = false;

function clearUpdateCheckInterval(): void {
  if (!updateCheckInterval) return;
  clearInterval(updateCheckInterval);
  updateCheckInterval = null;
}

function setupUpdateCheckInterval(
  registration: ServiceWorkerRegistration,
): void {
  clearUpdateCheckInterval();
  updateCheckInterval = setInterval(() => {
    registration.update().catch(() => {});
  }, UPDATE_CHECK_INTERVAL_MS);
}

export function initPWA(options: PWAInitOptions = {}): void {
  if (didInit) return;
  didInit = true;

  const { onNeedRefresh, onOfflineReady, onRegistered, onRegisterError } =
    options;

  updateSWFunction = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh?.();
    },
    onOfflineReady() {
      onOfflineReady?.();
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return;

      onRegistered?.(registration);

      // 定期检查更新（每小时一次）：让 “needRefresh” 更及时出现。
      setupUpdateCheckInterval(registration);
    },
    onRegisterError(error) {
      onRegisterError?.(error);
    },
  });
}

export function cleanupPWA(): void {
  clearUpdateCheckInterval();
  updateSWFunction = null;
  didInit = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupPWA();
  });
}

export async function updateServiceWorker(): Promise<void> {
  await updateSWFunction?.();
}

export function cacheUrls(urls: string[]): void {
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "CACHE_URLS",
    payload: urls,
  });
}

export function clearCache(cacheName: string): void {
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "CLEAR_CACHE",
    payload: cacheName,
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(
  callback: (online: boolean) => void,
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
