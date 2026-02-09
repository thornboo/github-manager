import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStars, getLanguages } from "@/hooks/useStars";
import { useListStars, useLists, useAddToList } from "@/hooks/useLists";
import { useTags } from "@/contexts/TagsContext";
import { useRepoMeta } from "@/contexts/RepoMetaContext";
import { StarsToolbar } from "@/components/stars/StarsToolbar";
import { AIResultsSheet } from "@/components/stars/AIResultsSheet";
import { VirtualStarsGrid } from "@/components/stars/VirtualStarsGrid";
import { VirtualStarsList } from "@/components/stars/VirtualStarsList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Button } from "@/components/ui/button";
import {
  useFilteredRepos,
  useSortedRepos,
  useStarsDashboardAI,
} from "@/hooks/business";
import { useStarsDashboardUrlState } from "@/hooks/ui/useStarsDashboardUrlState";
import { useIdSelection } from "@/hooks/ui/useIdSelection";
import { useResponsiveColumns } from "@/hooks/ui/useResponsiveColumns";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import type { SearchMode, ViewMode } from "@/types/ui";

interface StarsDashboardProps {
  selectedList: string | null;
  selectedTag: string | null;
  selectedTopic: string | null;
}

export function StarsDashboard({
  selectedList,
  selectedTag,
  selectedTopic,
}: StarsDashboardProps) {
  const SCROLL_OFFSET_STORAGE_KEY = "github_stars_scroll_offset";

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnCount = useResponsiveColumns();
  const didInitResetRef = useRef(false);
  const didRestoreScrollRef = useRef(false);
  const savedScrollOffsetRef = useRef<number | null>(null);

  const {
    data: stars,
    dataUpdatedAt: starsUpdatedAt,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useStars();
  const { data: listRepoIds, isLoading: isLoadingList } =
    useListStars(selectedList);
  const { data: lists } = useLists();
  const { mutate: addRepoToList } = useAddToList();

  const { repoMeta, addTagToRepo, setRepoNote } = useRepoMeta();
  const { tags, createTag } = useTags();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [searchMode, setSearchMode] = useState<SearchMode>("normal");
  const [searchParams] = useSearchParams();

  const {
    language,
    setLanguage,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
  } = useStarsDashboardUrlState(searchParams);

  const {
    selectedIds: selectedRepos,
    toggleId: toggleRepoSelection,
    selectIds,
    clearSelection,
  } = useIdSelection<number>();

  const ai = useStarsDashboardAI({
    stars,
    repoMeta,
    tags,
    lists,
    selectedRepos,
    addRepoToList,
    createTag,
    addTagToRepo,
    setRepoNote,
  });
  const { clearSearch } = ai;
  const effectiveSearch = searchMode === "normal" ? debouncedSearch : search;

  const languages = useMemo(() => (stars ? getLanguages(stars) : []), [stars]);

  // Count uncategorized repos (no tags)
  const uncategorizedCount = useMemo(
    () =>
      stars
        ? stars.filter((repo) => (repoMeta[repo.id]?.tags?.length || 0) === 0)
            .length
        : 0,
    [stars, repoMeta],
  );

  const filteredBase = useFilteredRepos({
    repos: stars || [],
    selectedList,
    listRepoIds,
    selectedTag,
    repoMeta,
    selectedTopic,
    search: effectiveSearch,
    language,
    searchMode,
    searchResults: ai.searchResults,
  });

  const shouldSort = !(
    searchMode === "ai" &&
    ai.searchResults &&
    ai.searchResults.length > 0
  );
  const filteredRepos = useSortedRepos(filteredBase, sortField, sortDirection, {
    enabled: shouldSort,
  });

  const handleSelectAll = useCallback(() => {
    selectIds((stars || []).map((r) => r.id));
  }, [stars, selectIds]);

  const handleSelectFiltered = useCallback(() => {
    selectIds(filteredRepos.map((r) => r.id));
  }, [filteredRepos, selectIds]);

  const handleSearchModeChange = useCallback(
    (mode: SearchMode) => {
      setSearchMode(mode);
      clearSearch();
      if (mode === "normal") {
        setSearch("");
      }
    },
    [clearSearch],
  );

  const isLoadingData = isLoading || (selectedList && isLoadingList);
  const hasError = Boolean(error);
  const hasStars = Boolean(stars && stars.length > 0);

  // 记录滚动位置（用于刷新/返回页面时恢复）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCROLL_OFFSET_STORAGE_KEY);
      if (!raw) return;
      const offset = Number(raw);
      if (Number.isFinite(offset) && offset > 0) {
        savedScrollOffsetRef.current = offset;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        try {
          localStorage.setItem(SCROLL_OFFSET_STORAGE_KEY, String(el.scrollTop));
        } catch {
          // ignore
        }
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 过滤/排序条件变化时重置滚动位置，避免落在空白区域。
  // 注意：必须在任何 early return 之前调用 hooks，保证调用顺序一致。
  const resetScrollKey = `${selectedList ?? ""}|${selectedTag ?? ""}|${
    selectedTopic ?? ""
  }|${searchMode}|${effectiveSearch}|${language ?? ""}|${sortField}|${sortDirection}`;
  useEffect(() => {
    if (!didInitResetRef.current) {
      didInitResetRef.current = true;
      return;
    }
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [resetScrollKey]);

  // 恢复滚动位置：只在数据可展示时恢复一次，避免 loading 状态下被 clamp 到 0。
  useEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (isLoadingData || hasError || !hasStars) return;

    const el = scrollContainerRef.current;
    const offset = savedScrollOffsetRef.current;
    if (el && offset && offset > 0) {
      el.scrollTo({ top: offset });
    }
    didRestoreScrollRef.current = true;
  }, [isLoadingData, hasError, hasStars]);

  const totalCount = !hasStars
    ? 0
    : selectedList && listRepoIds
      ? listRepoIds.length
      : selectedTag
        ? Object.values(repoMeta).filter((m) => m.tags.includes(selectedTag))
            .length
        : selectedTopic
          ? (stars || []).filter((r) => r.topics?.includes(selectedTopic))
              .length
          : (stars || []).length;

  return (
    <div className="h-full flex flex-col gap-6">
      {hasStars && !isLoadingData && !hasError ? (
        <StarsToolbar
          search={search}
          onSearchChange={setSearch}
          language={language}
          onLanguageChange={setLanguage}
          languages={languages}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
          totalCount={totalCount}
          filteredCount={filteredRepos.length}
          selectedCount={selectedRepos.size}
          onSelectAll={handleSelectAll}
          onSelectFiltered={handleSelectFiltered}
          onDeselectAll={clearSelection}
          // AI Analysis props
          aiEnabled={ai.aiSettings.enabled}
          uncategorizedCount={uncategorizedCount}
          isAnalyzing={ai.progress.status === "analyzing"}
          isPaused={ai.isPaused}
          progress={{
            completed: ai.progress.completed,
            total: ai.progress.total,
          }}
          suggestions={ai.suggestions}
          analysisDepth={ai.aiSettings.analysisDepth}
          onAnalysisDepthChange={(depth) =>
            ai.updateSettings({ analysisDepth: depth })
          }
          onAnalyze={ai.analyze}
          onPause={ai.pauseAnalysis}
          onResume={ai.resumeAnalysis}
          onCancel={ai.cancelAnalysis}
          onViewResults={() => ai.setShowResults(true)}
          // AI Search props
          searchMode={searchMode}
          onSearchModeChange={handleSearchModeChange}
          isAISearching={ai.isAISearching}
          onAISearch={() => ai.runAISearch(search)}
        />
      ) : null}

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto">
        {isLoadingData ? (
          <LoadingOverlay />
        ) : hasError ? (
          <EmptyState
            title="加载失败"
            description={error?.message || "获取 Star 数据时发生异常"}
            action={
              <Button
                variant="outline"
                onClick={() => void refetch()}
                disabled={isRefetching}
                className="gap-2"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefetching && "animate-spin")}
                />
                重试
              </Button>
            }
          />
        ) : !hasStars ? (
          <EmptyState
            title="还没有 Star 任何仓库"
            description="去 GitHub 上探索一些有趣的项目吧！"
          />
        ) : (
          <>
            {filteredRepos.length === 0 ? (
              <EmptyState
                className="py-12"
                title="没有找到匹配的仓库"
                description="试试其他搜索关键词或筛选条件"
              />
            ) : viewMode === "card" ? (
              <VirtualStarsGrid
                key={`stars-grid-${columnCount}`}
                repos={filteredRepos}
                selectedRepos={selectedRepos}
                onToggleSelect={toggleRepoSelection}
                onAnalyze={ai.analyzeSingle}
                columnCount={columnCount}
                dataUpdatedAt={starsUpdatedAt}
                scrollElementRef={scrollContainerRef}
              />
            ) : (
              <VirtualStarsList
                repos={filteredRepos}
                selectedRepos={selectedRepos}
                onToggleSelect={toggleRepoSelection}
                scrollElementRef={scrollContainerRef}
              />
            )}
          </>
        )}
      </div>

      <AIResultsSheet
        open={ai.showResults}
        onOpenChange={ai.setShowResults}
        suggestions={ai.suggestions}
        isAnalyzing={ai.progress.status === "analyzing"}
        progress={{
          completed: ai.progress.completed,
          total: ai.progress.total,
        }}
        onApply={ai.applySuggestion}
        onApplyAll={ai.applyAll}
        onClear={ai.clearSuggestions}
        onFillNote={setRepoNote}
      />

      <ScrollToTop scrollContainerRef={scrollContainerRef} />
    </div>
  );
}
