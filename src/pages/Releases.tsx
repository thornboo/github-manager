import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { Header } from "@/components/layout/Header";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReleases } from "@/hooks/state/useReleases";
import { useReleasesFetch } from "@/hooks/api/useReleasesFetch";
import { useStars } from "@/hooks/api/useStars";
import { ReleaseTimeline } from "@/components/releases/ReleaseTimeline";
import { SubscriptionList } from "@/components/releases/SubscriptionList";
import { AddSubscriptionDialog } from "@/components/releases/AddSubscriptionDialog";

function ReleasesContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    subscriptions,
    addSubscriptions,
    removeSubscription,
    updateLatestRelease,
    markAllChecked,
  } = useReleases();
  const {
    data: releases,
    isLoading: isLoadingReleases,
    refetch,
  } = useReleasesFetch(subscriptions);
  const { data: starredRepos = [], isLoading: isLoadingStars } = useStars();

  // 进入页面即视为“已查看”，用于首页的待更新统计清零。
  useEffect(() => {
    if (subscriptions.length === 0) return;
    markAllChecked();
  }, [markAllChecked, subscriptions.length]);

  // Update subscription latest release info when releases are fetched
  useEffect(() => {
    if (releases && releases.length > 0) {
      // Group releases by repo and get the latest for each
      const latestByRepo = new Map<string, (typeof releases)[0]>();
      releases.forEach((release) => {
        const existing = latestByRepo.get(release.repoFullName);
        if (
          !existing ||
          new Date(release.published_at) > new Date(existing.published_at)
        ) {
          latestByRepo.set(release.repoFullName, release);
        }
      });

      // Update each subscription with its latest release
      latestByRepo.forEach((release, repoFullName) => {
        updateLatestRelease(repoFullName, {
          tagName: release.tag_name,
          name: release.name,
          publishedAt: release.published_at,
          htmlUrl: release.html_url,
        });
      });
    }
  }, [releases, updateLatestRelease]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Release 跟踪</h1>
              <p className="text-muted-foreground mt-1">
                订阅仓库的 Release 更新，第一时间获取新版本通知
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoadingReleases || subscriptions.length === 0}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingReleases ? "animate-spin" : ""}`}
                />
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加订阅
              </Button>
            </div>
          </div>

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList>
              <TabsTrigger value="timeline">全部更新</TabsTrigger>
              <TabsTrigger value="subscriptions">
                我的订阅 ({subscriptions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <ReleaseTimeline
                releases={releases || []}
                isLoading={isLoadingReleases}
              />
            </TabsContent>

            <TabsContent value="subscriptions" className="mt-6">
              <SubscriptionList
                subscriptions={subscriptions}
                onRemove={removeSubscription}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AddSubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        starredRepos={starredRepos}
        subscribedRepos={subscriptions.map((s) => s.repoFullName)}
        onAddSubscriptions={addSubscriptions}
      />
    </div>
  );
}

const Releases = () => {
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

  return <ReleasesContent />;
};

export default Releases;
