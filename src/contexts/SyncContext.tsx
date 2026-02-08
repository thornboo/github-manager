import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useStars, setCachedStars } from "@/hooks/useStars";
import { usePullRequests, setCachedPRs } from "@/hooks/usePullRequests";
import { useIssues, setCachedIssues } from "@/hooks/useIssues";
import { useSyncSettings } from "@/hooks/useSyncSettings";
import { useAuth } from "@/contexts/AuthContext";
import { StarredRepo, GitHubPullRequest, GitHubIssue } from "@/types/github";
import { SyncStatus } from "@/components/layout/SyncButton";

interface SyncContextType {
  stars: StarredRepo[] | undefined;
  pullRequests:
    | { created: GitHubPullRequest[]; involved: GitHubPullRequest[] }
    | undefined;
  issues: { created: GitHubIssue[]; involved: GitHubIssue[] } | undefined;
  starsError: string | null;
  pullRequestsError: string | null;
  issuesError: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncTime: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "同步失败";
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const {
    data: starsData,
    isLoading: starsLoading,
    isFetching: starsFetching,
    error: starsError,
    refetch: refetchStars,
  } = useStars();
  const {
    data: prsData,
    isLoading: prsLoading,
    isFetching: prsFetching,
    error: pullRequestsError,
    refetch: refetchPRs,
  } = usePullRequests();
  const {
    data: issuesData,
    isLoading: issuesLoading,
    isFetching: issuesFetching,
    error: issuesError,
    refetch: refetchIssues,
  } = useIssues();
  const { settings, setLastSyncedAt, setSyncStatus, getTimeSinceLastSync } =
    useSyncSettings();

  const isLoading = starsLoading || prsLoading || issuesLoading;
  const isFetching = starsFetching || prsFetching || issuesFetching;

  const starsErrorMessage = starsError ? getErrorMessage(starsError) : null;
  const pullRequestsErrorMessage = pullRequestsError
    ? getErrorMessage(pullRequestsError)
    : null;
  const issuesErrorMessage = issuesError ? getErrorMessage(issuesError) : null;

  // 同步成功后保存到 localStorage
  useEffect(() => {
    if (starsData && starsData.length > 0) {
      setCachedStars(starsData);
    }
  }, [starsData]);

  useEffect(() => {
    if (
      prsData &&
      (prsData.created.length > 0 || prsData.involved.length > 0)
    ) {
      setCachedPRs(prsData);
    }
  }, [prsData]);

  useEffect(() => {
    if (
      issuesData &&
      (issuesData.created.length > 0 || issuesData.involved.length > 0)
    ) {
      setCachedIssues(issuesData);
    }
  }, [issuesData]);

  const triggerSync = useCallback(async () => {
    setSyncStatus("syncing");

    try {
      const [starsResult, prsResult, issuesResult] = await Promise.all([
        refetchStars(),
        refetchPRs(),
        refetchIssues(),
      ]);

      const failedResult = [starsResult, prsResult, issuesResult].find(
        (result) => result.isError,
      );

      if (failedResult) {
        throw failedResult.error || new Error("同步失败");
      }

      setLastSyncedAt(new Date());
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      setSyncStatus("error", getErrorMessage(err));
    }
  }, [refetchStars, refetchPRs, refetchIssues, setLastSyncedAt, setSyncStatus]);

  // 自动同步逻辑
  useEffect(() => {
    if (!isAuthenticated || settings.mode !== "auto") return;

    const interval = setInterval(
      () => {
        void triggerSync();
      },
      settings.autoSyncInterval * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [isAuthenticated, settings.mode, settings.autoSyncInterval, triggerSync]);

  return (
    <SyncContext.Provider
      value={{
        stars: starsData,
        pullRequests: prsData,
        issues: issuesData,
        starsError: starsErrorMessage,
        pullRequestsError: pullRequestsErrorMessage,
        issuesError: issuesErrorMessage,
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
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
