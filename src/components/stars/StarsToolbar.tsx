import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, List, Search, X, ArrowUpDown, Sparkles, Loader2 } from 'lucide-react';
import { AIAnalysisButton, AnalysisScope, AnalysisDepth } from './AIAnalysisButton';
import { RepoSuggestion } from '@/hooks/useAIAnalysis';

export type SortField = 'stars' | 'updated' | 'name' | 'forks' | 'starred';
export type SortDirection = 'asc' | 'desc';
export type SearchMode = 'normal' | 'ai';

interface StarsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  language: string | null;
  onLanguageChange: (value: string | null) => void;
  languages: string[];
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
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

const SORT_OPTIONS = [
  { value: 'starred-desc', label: '最近收藏', field: 'starred' as SortField, direction: 'desc' as SortDirection },
  { value: 'starred-asc', label: '最早收藏', field: 'starred' as SortField, direction: 'asc' as SortDirection },
  { value: 'stars-desc', label: 'Stars 最多', field: 'stars' as SortField, direction: 'desc' as SortDirection },
  { value: 'stars-asc', label: 'Stars 最少', field: 'stars' as SortField, direction: 'asc' as SortDirection },
  { value: 'updated-desc', label: '最近更新', field: 'updated' as SortField, direction: 'desc' as SortDirection },
  { value: 'updated-asc', label: '最早更新', field: 'updated' as SortField, direction: 'asc' as SortDirection },
  { value: 'name-asc', label: '名称 A-Z', field: 'name' as SortField, direction: 'asc' as SortDirection },
  { value: 'name-desc', label: '名称 Z-A', field: 'name' as SortField, direction: 'desc' as SortDirection },
  { value: 'forks-desc', label: 'Forks 最多', field: 'forks' as SortField, direction: 'desc' as SortDirection },
];

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
  const currentSortValue = `${sortField}-${sortDirection}`;
  
  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option) {
      onSortChange(option.field, option.direction);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchMode === 'ai' && search.trim()) {
      onAISearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search with mode toggle */}
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            {isAISearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : searchMode === 'ai' ? (
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder={searchMode === 'ai' ? "用自然语言描述你要找的仓库..." : "搜索仓库名称、描述或标签..."}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Search Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0" disabled={!aiEnabled}>
                {searchMode === 'ai' ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSearchModeChange('normal')}>
                <Search className="h-4 w-4 mr-2" />
                普通搜索
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSearchModeChange('ai')} disabled={!aiEnabled}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI 智能搜索
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI Search Button (only show when AI mode is active and has query) */}
          {searchMode === 'ai' && search.trim() && (
            <Button
              onClick={onAISearch}
              disabled={isAISearching || !aiEnabled}
              size="sm"
              className="shrink-0"
            >
              {isAISearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '搜索'
              )}
            </Button>
          )}
        </div>

        {/* Language filter */}
        <Select
          value={language || 'all'}
          onValueChange={(value) => onLanguageChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="全部语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部语言</SelectItem>
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View mode toggle */}
        <div className="flex border rounded-md h-9">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('grid')}
            className="rounded-r-none h-full w-9"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('list')}
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
          
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectAll}>
            全选
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectFiltered}>
            筛选全选
          </Button>
          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onDeselectAll}>
              取消选择
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
