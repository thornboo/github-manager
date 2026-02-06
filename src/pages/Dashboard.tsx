import { useAuth } from "@/contexts/AuthContext";
import { useSyncContext } from "@/contexts/SyncContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";
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
  const { stars, pullRequests, issues, isLoading } = useSyncContext();
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
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
