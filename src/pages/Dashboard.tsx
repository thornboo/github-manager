import { useAuth } from '@/contexts/AuthContext';
import { useSyncContext } from '@/contexts/SyncContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Header } from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { LanguagePieChart } from '@/components/dashboard/LanguagePieChart';
import { StarTrendChart } from '@/components/dashboard/StarTrendChart';
import { TopTopicsChart } from '@/components/dashboard/TopTopicsChart';
import { ActivityChart } from '@/components/dashboard/ActivityChart';

function DashboardContent() {
  const { stars, isLoading } = useSyncContext();
  const stats = useDashboardStats(stars);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">仓库统计分析</h1>
            <p className="text-muted-foreground mt-1">
              查看你 Star 的仓库的统计图表和分析
            </p>
          </div>

          {/* 概览统计卡片 */}
          <StatsCards
            totalStars={stats.totalStars}
            languageCount={stats.languageCount}
            topLanguage={stats.topLanguage}
            newStarsThisMonth={stats.newStarsThisMonth}
            isLoading={isLoading}
          />

          {/* 图表区域 */}
          <div className="grid gap-6 md:grid-cols-2">
            <LanguagePieChart data={stats.languageDistribution} isLoading={isLoading} />
            <StarTrendChart data={stats.starTrend} isLoading={isLoading} />
            <TopTopicsChart data={stats.topTopics} isLoading={isLoading} />
            <ActivityChart data={stats.activityData} isLoading={isLoading} />
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
