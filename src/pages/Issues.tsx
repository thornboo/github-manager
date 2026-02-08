import { useState, useMemo, useEffect } from "react";
import { Search, CircleDot, CheckCircle2, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useSyncContext } from "@/contexts/SyncContext";
import { IssueCard } from "@/components/issues/IssueCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonLoading } from "@/components/common/SkeletonLoading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueSource } from "@/hooks/useIssues";
import { useDebounce } from "@/hooks/useDebounce";

type IssueFilter = "all" | "open" | "closed";
type IssueSourceFilter = IssueSource | "all";

export default function Issues() {
  const { issues, isLoading, isSyncing, issuesError, triggerSync } =
    useSyncContext();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [source, setSource] = useState<IssueSourceFilter>("created");
  const [searchParams] = useSearchParams();

  // URL 参数支持：/issues?state=open&source=all
  useEffect(() => {
    const stateParam = searchParams.get("state");
    if (
      stateParam === "all" ||
      stateParam === "open" ||
      stateParam === "closed"
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

  const currentIssues = useMemo(() => {
    if (!issues) return [];
    if (source === "all") return [...issues.created, ...issues.involved];
    return source === "created" ? issues.created : issues.involved;
  }, [issues, source]);

  const filteredIssues = useMemo(() => {
    let filtered = currentIssues;

    // 过滤状态
    if (filter === "open") {
      filtered = filtered.filter((issue) => issue.state === "open");
    } else if (filter === "closed") {
      filtered = filtered.filter((issue) => issue.state === "closed");
    }

    // 搜索
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.repository_url.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [currentIssues, filter, debouncedSearch]);

  const counts = useMemo(() => {
    return {
      all: currentIssues.length,
      open: currentIssues.filter((issue) => issue.state === "open").length,
      closed: currentIssues.filter((issue) => issue.state === "closed").length,
    };
  }, [currentIssues]);

  const hasIssuesLoadError = Boolean(issuesError && !issues);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索 Issue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as IssueSourceFilter)}
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
              onValueChange={(v) => setFilter(v as IssueFilter)}
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-1">
                  全部{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.all})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="open" className="gap-1">
                  <CircleDot className="h-3 w-3" />
                  Open{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.open})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="closed" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Closed{" "}
                  <span className="text-xs text-muted-foreground">
                    ({counts.closed})
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading && !issues ? (
          <SkeletonLoading variant="list" count={6} />
        ) : hasIssuesLoadError ? (
          <EmptyState
            title="Issues 加载失败"
            description={issuesError || "请稍后重试"}
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
        ) : filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CircleDot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">暂无 Issues</h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "没有找到匹配的 Issue"
                : source === "created"
                  ? "你还没有创建过 Issue"
                  : source === "involved"
                    ? "你还没有参与过其他人的 Issue"
                    : "你还没有任何 Issue 记录"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
