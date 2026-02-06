import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncSettings {
  mode: "auto" | "manual";
  autoSyncInterval: number; // in minutes
  lastSyncedAt: string | null;
  lastSyncStatus: SyncStatus;
  lastSyncError: string | null;
}

const defaultSettings: SyncSettings = {
  mode: "manual",
  autoSyncInterval: 5,
  lastSyncedAt: null,
  lastSyncStatus: "idle",
  lastSyncError: null,
};

export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.syncSettings);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load sync settings:", e);
    }
    return defaultSettings;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.syncSettings, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save sync settings:", e);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<SyncSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const setLastSyncedAt = useCallback((date: Date) => {
    setSettings((prev) => ({ ...prev, lastSyncedAt: date.toISOString() }));
  }, []);

  const setSyncStatus = useCallback((status: SyncStatus, error?: string) => {
    setSettings((prev) => ({
      ...prev,
      lastSyncStatus: status,
      lastSyncError: error || null,
    }));
  }, []);

  const getTimeSinceLastSync = useCallback((): string | null => {
    if (!settings.lastSyncedAt) return null;

    const lastSync = new Date(settings.lastSyncedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} 天前`;
  }, [settings.lastSyncedAt]);

  return {
    settings,
    updateSettings,
    setLastSyncedAt,
    setSyncStatus,
    getTimeSinceLastSync,
  };
}
