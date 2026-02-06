import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { AIAnalysisButton } from "./AIAnalysisButton";
import { StarsSearchBar } from "./StarsSearchBar";
import { StarsFilter } from "./StarsFilter";
import type { AnalysisDepth, AnalysisScope, RepoSuggestion } from "@/types/ai";
import type {
  SearchMode,
  SortDirection,
  SortOption,
  ViewMode,
} from "@/types/ui";

export type SortField = SortOption;
export type { SortDirection, SearchMode, ViewMode } from "@/types/ui";

interface StarsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  language: string | null;
  onLanguageChange: (value: string | null) => void;
  languages: string[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectFiltered: () => void;
  onDeselectAll: () => void;
  // AI Analysis props
  aiEnabled: boolean;
  uncategorizedCount: number;
  isAnalyzing: boolean;
  isPaused: boolean;
  progress: { completed: number; total: number };
  suggestions: RepoSuggestion[];
  analysisDepth: AnalysisDepth;
  onAnalysisDepthChange: (depth: AnalysisDepth) => void;
  onAnalyze: (scope: AnalysisScope, depth: AnalysisDepth) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onViewResults: () => void;
  // AI Search props
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  isAISearching: boolean;
  onAISearch: () => void;
}

export function StarsToolbar({
  search,
  onSearchChange,
  language,
  onLanguageChange,
  languages,
  viewMode,
  onViewModeChange,
  sortField,
  sortDirection,
  onSortChange,
  totalCount,
  filteredCount,
  selectedCount,
  onSelectAll,
  onSelectFiltered,
  onDeselectAll,
  // AI Analysis props
  aiEnabled,
  uncategorizedCount,
  isAnalyzing,
  isPaused,
  progress,
  suggestions,
  analysisDepth,
  onAnalysisDepthChange,
  onAnalyze,
  onPause,
  onResume,
  onCancel,
  onViewResults,
  // AI Search props
  searchMode,
  onSearchModeChange,
  isAISearching,
  onAISearch,
}: StarsToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <StarsSearchBar
          search={search}
          onSearchChange={onSearchChange}
          searchMode={searchMode}
          onSearchModeChange={onSearchModeChange}
          isAISearching={isAISearching}
          onAISearch={onAISearch}
          aiEnabled={aiEnabled}
        />

        <StarsFilter
          language={language}
          onLanguageChange={onLanguageChange}
          languages={languages}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />

        {/* View mode toggle */}
        <div className="flex border rounded-md h-9">
          <Button
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("card")}
            className="rounded-r-none h-full w-9"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
            className="rounded-l-none h-full w-9"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Analysis Button */}
        <AIAnalysisButton
          totalCount={totalCount}
          uncategorizedCount={uncategorizedCount}
          selectedCount={selectedCount}
          isAnalyzing={isAnalyzing}
          isPaused={isPaused}
          progress={progress}
          suggestions={suggestions}
          depth={analysisDepth}
          onDepthChange={onAnalysisDepthChange}
          onAnalyze={onAnalyze}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onViewResults={onViewResults}
          disabled={!aiEnabled}
        />
      </div>

      {/* Results count with selection info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {filteredCount === totalCount ? (
          <span>共 {totalCount} 个 Stars</span>
        ) : (
          <span>
            显示 {filteredCount} / {totalCount} 个结果
          </span>
        )}

        {/* Selection status and batch actions */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              已选中 {selectedCount} 个
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onSelectAll}
          >
            全选
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onSelectFiltered}
          >
            筛选全选
          </Button>
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onDeselectAll}
            >
              取消选择
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
