import { useState, useMemo, useEffect } from "react";
import { Search, GitPullRequest, GitMerge, XCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useSyncContext } from "@/contexts/SyncContext";
import { PRCard } from "@/components/pr/PRCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRSource } from "@/hooks/api/usePullRequests";

type PRFilter = "all" | "open" | "closed" | "merged";
type PRSourceFilter = PRSource | "all";

export default function PullRequests() {
  const { pullRequests, isLoading } = useSyncContext();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PRFilter>("all");
  const [source, setSource] = useState<PRSourceFilter>("created");
  const [searchParams] = useSearchParams();

  // URL 参数支持：/pulls?state=open&source=all
  useEffect(() => {
    const stateParam = searchParams.get("state");
    if (
      stateParam === "all" ||
      stateParam === "open" ||
      stateParam === "closed" ||
      stateParam === "merged"
    ) {
      setFilter(stateParam);
    }

    const sourceParam = searchParams.get("source");
    if (
      sourceParam === "created" ||
      sourceParam === "involved" ||
      sourceParam === "all"
    ) {
      setSource(sourceParam);
    }
  }, [searchParams]);

  const currentPRs = useMemo(() => {
    if (!pullRequests) return [];
    if (source === "all")
      return [...pullRequests.created, ...pullRequests.involved];
    return source === "created" ? pullRequests.created : pullRequests.involved;
  }, [pullRequests, source]);

  const filteredPRs = useMemo(() => {
    let filtered = currentPRs;

    // 过滤状态
    if (filter === "open") {
      filtered = filtered.filter((pr) => pr.state === "open");
    } else if (filter === "closed") {
      filtered = filtered.filter(
        (pr) => pr.state === "closed" && !pr.pull_request?.merged_at,
      );
    } else if (filter === "merged") {
      filtered = filtered.filter((pr) => pr.pull_request?.merged_at);
    }

    // 搜索
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.title.toLowerCase().includes(searchLower) ||
          pr.repository_url.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [currentPRs, filter, search]);

  const counts = useMemo(() => {
    return {
      all: currentPRs.length,
      open: currentPRs.filter((pr) => pr.state === "open").length,
      closed: currentPRs.filter(
        (pr) => pr.state === "closed" && !pr.pull_request?.merged_at,
      ).length,
      merged: currentPRs.filter((pr) => pr.pull_request?.merged_at).length,
    };
  }, [currentPRs]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索 PR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as PRSourceFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="created">我创建的</SelectItem>
                <SelectItem value="involved">我参与的</SelectItem>
              </SelectContent>
            </Select>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as PRFilter)}
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-1">
                  全部{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.all})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="open" className="gap-1">
                  <GitPullRequest className="h-3 w-3" />
                  Open{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.open})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="merged" className="gap-1">
                  <GitMerge className="h-3 w-3" />
                  Merged{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.merged})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="closed" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Closed{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.closed})
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading && !pullRequests ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">暂无 Pull Requests</h3>
            <p className="text-sm text-muted-foreground">
              {search
                ? "没有找到匹配的 PR"
                : source === "created"
                  ? "你还没有提交过 PR"
                  : source === "involved"
                    ? "你还没有参与过其他人的 PR"
                    : "你还没有任何 PR 记录"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPRs.map((pr) => (
              <PRCard key={pr.id} pr={pr} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
