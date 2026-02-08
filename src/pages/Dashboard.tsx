import { useAuth } from "@/contexts/AuthContext";
import { useSyncContext } from "@/contexts/SyncContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonLoading } from "@/components/common/SkeletonLoading";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { OpenPRList } from "@/components/dashboard/OpenPRList";
import { OpenIssueList } from "@/components/dashboard/OpenIssueList";
import { RecentStars } from "@/components/dashboard/RecentStars";
import { LanguagePieChart } from "@/components/dashboard/LanguagePieChart";
import { StarTrendChart } from "@/components/dashboard/StarTrendChart";
import { useReleases } from "@/hooks/useReleases";
import { useBatchReleases } from "@/hooks/useBatchReleases";
import { useEffect } from "react";

function DashboardContent() {
  const {
    stars,
    pullRequests,
    issues,
    starsError,
    pullRequestsError,
    issuesError,
    isLoading,
    isSyncing,
    triggerSync,
  } = useSyncContext();
  const { subscriptions, updateLatestRelease } = useReleases();
  const { data: latestReleases } = useBatchReleases(subscriptions);

  // 在首页轻量同步订阅仓库的最新 Release 信息，用于“待更新 Release”统计。
  useEffect(() => {
    if (!latestReleases || latestReleases.size === 0) return;

    latestReleases.forEach((release, repoFullName) => {
      if (!release) return;
      updateLatestRelease(repoFullName, release);
    });
  }, [latestReleases, updateLatestRelease]);

  const stats = useDashboardStats(stars, pullRequests, issues, subscriptions);
  const dataErrors = [
    !stars && starsError ? `Stars: ${starsError}` : null,
    !pullRequests && pullRequestsError ? `PR: ${pullRequestsError}` : null,
    !issues && issuesError ? `Issues: ${issuesError}` : null,
  ].filter((message): message is string => Boolean(message));

  const hasBlockingError = !isLoading && dataErrors.length > 0;
  const showInitialSkeleton = isLoading && !stars && !pullRequests && !issues;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
        {showInitialSkeleton ? (
          <SkeletonLoading variant="dashboard" />
        ) : hasBlockingError ? (
          <div className="max-w-4xl mx-auto">
            <EmptyState
              title="首页数据加载失败"
              description={dataErrors.join("；")}
              action={
                <Button
                  variant="outline"
                  onClick={() => void triggerSync()}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                  重试
                </Button>
              }
            />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <OverviewCards
              stats={stats}
              isLoading={isLoading}
              subscriptionCount={subscriptions.length}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <OpenPRList prs={stats.openPRs} isLoading={isLoading} />
              <OpenIssueList issues={stats.openIssues} isLoading={isLoading} />
            </div>

            <RecentStars repos={stats.recentStars} isLoading={isLoading} />

            {/* 图表区域 */}
            <div className="grid gap-6 md:grid-cols-2">
              <LanguagePieChart
                data={stats.languageDistribution}
                isLoading={isLoading}
              />
              <StarTrendChart data={stats.starTrend} isLoading={isLoading} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardContent />;
};

export default Dashboard;
