import { useState, useEffect, useCallback } from 'react';
import { ReleaseSubscription } from '@/types/github';

const STORAGE_KEY = 'github_release_subscriptions';

function loadSubscriptions(): ReleaseSubscription[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load release subscriptions:', e);
  }
  return [];
}

function saveSubscriptions(subscriptions: ReleaseSubscription[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  } catch (e) {
    console.error('Failed to save release subscriptions:', e);
  }
}

export function useReleases() {
  const [subscriptions, setSubscriptions] = useState<ReleaseSubscription[]>(() => loadSubscriptions());

  // Save to localStorage whenever subscriptions change
  useEffect(() => {
    saveSubscriptions(subscriptions);
  }, [subscriptions]);

  const addSubscription = useCallback((repoFullName: string, repoId?: number) => {
    setSubscriptions(prev => {
      // Check if already subscribed
      if (prev.some(sub => sub.repoFullName.toLowerCase() === repoFullName.toLowerCase())) {
        return prev;
      }
      return [...prev, {
        repoFullName,
        repoId,
        subscribedAt: new Date().toISOString(),
      }];
    });
  }, []);

  const addSubscriptions = useCallback((repos: { fullName: string; id?: number }[]) => {
    setSubscriptions(prev => {
      const existing = new Set(prev.map(sub => sub.repoFullName.toLowerCase()));
      const newSubs = repos
        .filter(repo => !existing.has(repo.fullName.toLowerCase()))
        .map(repo => ({
          repoFullName: repo.fullName,
          repoId: repo.id,
          subscribedAt: new Date().toISOString(),
        }));
      return [...prev, ...newSubs];
    });
  }, []);

  const removeSubscription = useCallback((repoFullName: string) => {
    setSubscriptions(prev => 
      prev.filter(sub => sub.repoFullName.toLowerCase() !== repoFullName.toLowerCase())
    );
  }, []);

  const isSubscribed = useCallback((repoFullName: string): boolean => {
    return subscriptions.some(sub => sub.repoFullName.toLowerCase() === repoFullName.toLowerCase());
  }, [subscriptions]);

  const updateLatestRelease = useCallback((
    repoFullName: string, 
    release: ReleaseSubscription['latestRelease']
  ) => {
    setSubscriptions(prev => prev.map(sub => {
      if (sub.repoFullName.toLowerCase() === repoFullName.toLowerCase()) {
        return {
          ...sub,
          lastCheckedAt: new Date().toISOString(),
          latestRelease: release,
        };
      }
      return sub;
    }));
  }, []);

  const updateLastChecked = useCallback((repoFullName: string) => {
    setSubscriptions(prev => prev.map(sub => {
      if (sub.repoFullName.toLowerCase() === repoFullName.toLowerCase()) {
        return {
          ...sub,
          lastCheckedAt: new Date().toISOString(),
        };
      }
      return sub;
    }));
  }, []);

  return {
    subscriptions,
    addSubscription,
    addSubscriptions,
    removeSubscription,
    isSubscribed,
    updateLatestRelease,
    updateLastChecked,
  };
}
