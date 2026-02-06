import { useCallback, useEffect, useState } from "react";
import {
  initPWA,
  isOnline,
  onOnlineStatusChange,
  updateServiceWorker,
} from "@/lib/pwa";

export interface UsePWAResult {
  isOnline: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  registration: ServiceWorkerRegistration | null;
  updateApp: () => Promise<void>;
  dismissOfflineReady: () => void;
  dismissUpdate: () => void;
}

interface PWAStoreState {
  isOnline: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  registration: ServiceWorkerRegistration | null;
}

const store: {
  didInit: boolean;
  state: PWAStoreState;
  listeners: Set<(state: PWAStoreState) => void>;
  unsubscribeOnline: (() => void) | null;
} = {
  didInit: false,
  state: {
    isOnline: true,
    needRefresh: false,
    offlineReady: false,
    registration: null,
  },
  listeners: new Set(),
  unsubscribeOnline: null,
};

function setStoreState(partial: Partial<PWAStoreState>) {
  store.state = { ...store.state, ...partial };
  store.listeners.forEach((listener) => listener(store.state));
}

function ensureInit() {
  if (store.didInit) return;
  store.didInit = true;

  setStoreState({ isOnline: isOnline() });
  store.unsubscribeOnline = onOnlineStatusChange((online) => {
    setStoreState({ isOnline: online });
  });

  initPWA({
    onNeedRefresh: () => setStoreState({ needRefresh: true }),
    onOfflineReady: () => setStoreState({ offlineReady: true }),
    onRegistered: (registration) => setStoreState({ registration }),
    onRegisterError: (error) => {
      console.error("Service Worker registration error:", error);
    },
  });
}

export function usePWA(): UsePWAResult {
  const [state, setState] = useState<PWAStoreState>(() => store.state);

  useEffect(() => {
    ensureInit();

    store.listeners.add(setState);
    return () => {
      store.listeners.delete(setState);
    };
  }, []);

  const updateApp = useCallback(async () => {
    await updateServiceWorker();
  }, []);

  const dismissOfflineReady = useCallback(() => {
    setStoreState({ offlineReady: false });
  }, []);

  const dismissUpdate = useCallback(() => {
    setStoreState({ needRefresh: false });
  }, []);

  return {
    ...state,
    updateApp,
    dismissOfflineReady,
    dismissUpdate,
  };
}
