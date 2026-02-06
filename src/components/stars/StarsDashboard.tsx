import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStars, getLanguages } from "@/hooks/useStars";
import { useListStars, useLists, useAddToList } from "@/hooks/useLists";
import { useTags } from "@/contexts/TagsContext";
import { useRepoMeta } from "@/contexts/RepoMetaContext";
import { StarsToolbar } from "@/components/stars/StarsToolbar";
import { AIResultsSheet } from "@/components/stars/AIResultsSheet";
import { StarsGrid } from "@/components/stars/StarsGrid";
import { StarsList } from "@/components/stars/StarsList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";
import {
  useFilteredRepos,
  useSortedRepos,
  useStarsDashboardAI,
} from "@/hooks/business";
import { useStarsDashboardUrlState } from "@/hooks/ui/useStarsDashboardUrlState";
import { useIdSelection } from "@/hooks/ui/useIdSelection";
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
  const { data: stars, isLoading, error } = useStars();
  const { data: listRepoIds, isLoading: isLoadingList } =
    useListStars(selectedList);
  const { data: lists } = useLists();
  const { mutate: addRepoToList } = useAddToList();

  const { repoMeta, addTagToRepo, setRepoNote } = useRepoMeta();
  const { tags, createTag } = useTags();

  const [search, setSearch] = useState("");
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
    search,
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

  if (isLoadingData) {
    return <LoadingOverlay />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center text-destructive">
          <p>加载失败</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!stars || stars.length === 0) {
    return (
      <EmptyState
        title="还没有 Star 任何仓库"
        description="去 GitHub 上探索一些有趣的项目吧！"
      />
    );
  }

  const totalCount =
    selectedList && listRepoIds
      ? listRepoIds.length
      : selectedTag
        ? Object.values(repoMeta).filter((m) => m.tags.includes(selectedTag))
            .length
        : selectedTopic
          ? stars.filter((r) => r.topics?.includes(selectedTopic)).length
          : stars.length;

  return (
    <div className="space-y-6">
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
        onCancel={ai.resetAnalysis}
        onViewResults={() => ai.setShowResults(true)}
        // AI Search props
        searchMode={searchMode}
        onSearchModeChange={handleSearchModeChange}
        isAISearching={ai.isAISearching}
        onAISearch={() => ai.runAISearch(search)}
      />

      {filteredRepos.length === 0 ? (
        <EmptyState
          className="py-12"
          title="没有找到匹配的仓库"
          description="试试其他搜索关键词或筛选条件"
        />
      ) : viewMode === "card" ? (
        <StarsGrid
          repos={filteredRepos}
          selectedRepos={selectedRepos}
          onToggleSelect={toggleRepoSelection}
          onAnalyze={ai.analyzeSingle}
        />
      ) : (
        <StarsList repos={filteredRepos} />
      )}

      <AIResultsSheet
        open={ai.showResults}
        onOpenChange={ai.setShowResults}
        suggestions={ai.suggestions}
        onApply={ai.applySuggestion}
        onApplyAll={ai.applyAll}
        onClear={ai.clearSuggestions}
        onFillNote={setRepoNote}
      />
    </div>
  );
}
