import { useMemo } from "react";
import { usePWA } from "@/hooks/usePWA";

export interface UseOfflineDataResult<T> {
  data: T | undefined;
  isStale: boolean;
  isOffline: boolean;
  lastUpdated: Date | null;
}

export function useOfflineData<T>(
  queryData: T | undefined,
  cacheKey: string,
): UseOfflineDataResult<T> {
  const { isOnline } = usePWA();

  const cachedData = useMemo(() => {
    if (queryData) {
      // 在线拿到新数据时，写入离线缓存。
      try {
        localStorage.setItem(
          `offline_${cacheKey}`,
          JSON.stringify({ data: queryData, timestamp: Date.now() }),
        );
      } catch {
        // 忽略存储失败（例如 quota）
      }
      return queryData;
    }

    // 无 queryData 时回读缓存（用于离线/首次渲染）
    try {
      const cached = localStorage.getItem(`offline_${cacheKey}`);
      if (cached) return (JSON.parse(cached) as { data: T }).data;
    } catch {
      // 忽略读取失败
    }

    return undefined;
  }, [queryData, cacheKey]);

  const lastUpdated = useMemo(() => {
    try {
      const cached = localStorage.getItem(`offline_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { timestamp?: number };
        if (typeof parsed.timestamp === "number")
          return new Date(parsed.timestamp);
      }
    } catch {
      // ignore
    }
    return null;
  }, [cacheKey]);

  return {
    data: isOnline ? queryData : cachedData,
    isStale: !isOnline && !!cachedData,
    isOffline: !isOnline,
    lastUpdated,
  };
}
