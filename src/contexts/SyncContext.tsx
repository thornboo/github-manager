import { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useStars, setCachedStars } from '@/hooks/useStars';
import { usePullRequests, setCachedPRs } from '@/hooks/usePullRequests';
import { useIssues, setCachedIssues } from '@/hooks/useIssues';
import { useSyncSettings } from '@/hooks/useSyncSettings';
import { useAuth } from '@/contexts/AuthContext';
import { StarredRepo, GitHubPullRequest, GitHubIssue } from '@/types/github';
import { SyncStatus } from '@/components/layout/SyncButton';

interface SyncContextType {
  stars: StarredRepo[] | undefined;
  pullRequests: { created: GitHubPullRequest[]; involved: GitHubPullRequest[] } | undefined;
  issues: { created: GitHubIssue[]; involved: GitHubIssue[] } | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncTime: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: starsData, isLoading: starsLoading, isFetching: starsFetching, refetch: refetchStars } = useStars();
  const { data: prsData, isLoading: prsLoading, isFetching: prsFetching, refetch: refetchPRs } = usePullRequests();
  const { data: issuesData, isLoading: issuesLoading, isFetching: issuesFetching, refetch: refetchIssues } = useIssues();
  const { settings, setLastSyncedAt, setSyncStatus, getTimeSinceLastSync } = useSyncSettings();

  const isLoading = starsLoading || prsLoading || issuesLoading;
  const isFetching = starsFetching || prsFetching || issuesFetching;

  // 同步成功后保存到 localStorage
  useEffect(() => {
    if (starsData && starsData.length > 0) {
      setCachedStars(starsData);
    }
  }, [starsData]);

  useEffect(() => {
    if (prsData && (prsData.created.length > 0 || prsData.involved.length > 0)) {
      setCachedPRs(prsData);
    }
  }, [prsData]);

  useEffect(() => {
    if (issuesData && (issuesData.created.length > 0 || issuesData.involved.length > 0)) {
      setCachedIssues(issuesData);
    }
  }, [issuesData]);

  // 自动同步逻辑
  useEffect(() => {
    if (!isAuthenticated || settings.mode !== 'auto') return;

    const interval = setInterval(() => {
      setSyncStatus('syncing');
      Promise.all([refetchStars(), refetchPRs(), refetchIssues()])
        .then(() => {
          setLastSyncedAt(new Date());
          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch((err) => {
          setSyncStatus('error', err?.message || '同步失败');
        });
    }, settings.autoSyncInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, settings.mode, settings.autoSyncInterval, refetchStars, refetchPRs, refetchIssues, setLastSyncedAt, setSyncStatus]);

  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await Promise.all([refetchStars(), refetchPRs(), refetchIssues()]);
      setLastSyncedAt(new Date());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '同步失败';
      setSyncStatus('error', errorMessage);
    }
  }, [refetchStars, refetchPRs, refetchIssues, setLastSyncedAt, setSyncStatus]);

  return (
    <SyncContext.Provider
      value={{
        stars: starsData,
        pullRequests: prsData,
        issues: issuesData,
        isLoading,
        isSyncing: isFetching,
        syncStatus: settings.lastSyncStatus as SyncStatus,
        syncError: settings.lastSyncError,
        lastSyncTime: getTimeSinceLastSync(),
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}
