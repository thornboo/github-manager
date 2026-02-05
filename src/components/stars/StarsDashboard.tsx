import { useState, useMemo, useCallback } from 'react';
import { useStars, getLanguages, filterRepos } from '@/hooks/useStars';
import { useListStars, useLists, useAddToList } from '@/hooks/useLists';
import { useLocalDataContext } from '@/contexts/LocalDataContext';
import { StarsToolbar, SortField, SortDirection, SearchMode } from './StarsToolbar';
import { RepoCard } from './RepoCard';
import { RepoList } from './RepoList';
import { AIResultsSheet } from './AIResultsSheet';
import { Loader2 } from 'lucide-react';
import { StarredRepo } from '@/types/github';
import { useAIAnalysis, RepoSuggestion } from '@/hooks/useAIAnalysis';
import { useAISettings } from '@/hooks/useAISettings';
import { useAISearch } from '@/hooks/useAISearch';
import { toast } from 'sonner';
import { AnalysisScope, AnalysisDepth } from './AIAnalysisButton';

interface StarsDashboardProps {
  selectedList: string | null;
  selectedTag: string | null;
  selectedTopic: string | null;
}

export function StarsDashboard({ selectedList, selectedTag, selectedTopic }: StarsDashboardProps) {
  const { data: stars, isLoading, error } = useStars();
  const { data: listRepoIds, isLoading: isLoadingList } = useListStars(selectedList);
  const { data: lists } = useLists();
  const { mutate: addRepoToList } = useAddToList();
  const { repoMeta, tags, createTag, addTagToRepo, setRepoNote } = useLocalDataContext();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('starred');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('normal');

  const { settings: aiSettings, updateSettings, setLastAnalyzedAt } = useAISettings();
  const { progress, suggestions, analyzeRepos, analyzeSingleRepo, resetAnalysis, pauseAnalysis, resumeAnalysis, isPaused } = useAIAnalysis();
  const { isSearching: isAISearching, searchResults, aiSearch, clearSearch } = useAISearch();

  const languages = useMemo(() => {
    return stars ? getLanguages(stars) : [];
  }, [stars]);

  // Aggregate all topics from starred repos
  const allTopics = useMemo(() => {
    if (!stars) return [];
    const topicCounts: Record<string, number> = {};
    stars.forEach(repo => {
      repo.topics?.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [stars]);

  // Count uncategorized repos (no tags and not in any list)
  const uncategorizedCount = useMemo(() => {
    if (!stars) return 0;
    return stars.filter(repo => {
      const meta = repoMeta[repo.id];
      const hasTags = meta?.tags && meta.tags.length > 0;
      return !hasTags;
    }).length;
  }, [stars, repoMeta]);

  const sortRepos = (repos: StarredRepo[], field: SortField, direction: SortDirection): StarredRepo[] => {
    return [...repos].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'starred':
          comparison = new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime();
          break;
        case 'stars':
          comparison = a.stargazers_count - b.stargazers_count;
          break;
        case 'forks':
          comparison = a.forks_count - b.forks_count;
          break;
        case 'updated':
          comparison = new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime();
          break;
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const filteredRepos = useMemo(() => {
    if (!stars) return [];
    
    let repos = stars;
    
    // Filter by list if selected
    if (selectedList && listRepoIds) {
      repos = repos.filter(repo => listRepoIds.includes(repo.id));
    }
    
    // Filter by local tag if selected
    if (selectedTag) {
      repos = repos.filter(repo => {
        const meta = repoMeta[repo.id];
        return meta?.tags.includes(selectedTag);
      });
    }
    
    // Filter by GitHub topic if selected
    if (selectedTopic) {
      repos = repos.filter(repo => repo.topics?.includes(selectedTopic));
    }
    
    // Apply AI search results filter if in AI mode and has results
    if (searchMode === 'ai' && searchResults && searchResults.length > 0) {
      const matchedIds = new Set(searchResults.map(r => r.repoId));
      repos = repos.filter(repo => matchedIds.has(repo.id));
      // Sort by relevance
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      repos = [...repos].sort((a, b) => {
        const aMatch = searchResults.find(r => r.repoId === a.id);
        const bMatch = searchResults.find(r => r.repoId === b.id);
        const aOrder = aMatch ? relevanceOrder[aMatch.relevance] : 3;
        const bOrder = bMatch ? relevanceOrder[bMatch.relevance] : 3;
        return aOrder - bOrder;
      });
      return repos;
    }
    
    const filtered = filterRepos(repos, search, language);
    return sortRepos(filtered, sortField, sortDirection);
  }, [stars, search, language, selectedList, listRepoIds, selectedTag, repoMeta, selectedTopic, sortField, sortDirection, searchMode, searchResults]);

  // Get lists with repo IDs for AI search
  const listsWithRepos = useMemo(() => {
    if (!lists || !stars) return [];
    // Note: We don't have direct access to list repo mappings here, 
    // so we'll pass an empty array for now. The AI search will work without it.
    return [];
  }, [lists, stars]);

  const toggleRepoSelection = useCallback((repoId: number) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (stars) {
      setSelectedRepos(new Set(stars.map(r => r.id)));
    }
  }, [stars]);

  const handleSelectFiltered = useCallback(() => {
    setSelectedRepos(new Set(filteredRepos.map(r => r.id)));
  }, [filteredRepos]);

  const handleSearchModeChange = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    clearSearch();
    if (mode === 'normal') {
      setSearch('');
    }
  }, [clearSearch]);

  const handleAISearch = useCallback(async () => {
    if (!search.trim() || !stars) return;
    
    if (!aiSettings.enabled) {
      toast.error('请先在设置中启用并配置 AI 服务');
      return;
    }

    if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
      toast.error('请先在设置中配置 AI 服务商');
      return;
    }

    try {
      await aiSearch(
        search,
        stars,
        repoMeta,
        tags,
        listsWithRepos,
        aiSettings.provider
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 搜索失败';
      toast.error(errorMessage);
    }
  }, [search, stars, repoMeta, tags, listsWithRepos, aiSettings, aiSearch]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRepos(new Set());
  }, []);

  const handleAnalyze = useCallback(async (scope: AnalysisScope, depth: AnalysisDepth) => {
    if (!aiSettings.enabled) {
      toast.error('请先在设置中启用并配置 AI 服务');
      return;
    }

    if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
      toast.error('请先在设置中配置 AI 服务商');
      return;
    }

    let reposToAnalyze: StarredRepo[] = [];
    
    switch (scope) {
      case 'all':
        reposToAnalyze = stars || [];
        break;
      case 'uncategorized':
        reposToAnalyze = (stars || []).filter(repo => {
          const meta = repoMeta[repo.id];
          return !meta?.tags || meta.tags.length === 0;
        });
        break;
      case 'selected':
        reposToAnalyze = (stars || []).filter(repo => selectedRepos.has(repo.id));
        break;
    }

    if (reposToAnalyze.length === 0) {
      toast.warning('没有可分析的仓库');
      return;
    }

    const existingLists = lists?.map(l => ({ id: l.id, name: l.name })) || [];

    try {
      await analyzeRepos(reposToAnalyze, existingLists, tags, aiSettings.provider, depth, aiSettings.systemPrompt, aiSettings.userPrompt);
      setLastAnalyzedAt(new Date());
      setShowResults(true);
      toast.success('分析完成！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析失败';
      toast.error(errorMessage);
    }
  }, [aiSettings, stars, repoMeta, selectedRepos, lists, tags, analyzeRepos, setLastAnalyzedAt]);

  const handleSingleAnalyze = useCallback(async (repo: StarredRepo) => {
    if (!aiSettings.enabled) {
      toast.error('请先在设置中启用并配置 AI 服务');
      return;
    }

    if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
      toast.error('请先在设置中配置 AI 服务商');
      return;
    }

    const existingLists = lists?.map(l => ({ id: l.id, name: l.name })) || [];

    try {
      toast.loading('正在分析...', { id: `analyze-${repo.id}` });
      const result = await analyzeSingleRepo(repo, existingLists, tags, aiSettings.provider, aiSettings.analysisDepth, aiSettings.systemPrompt, aiSettings.userPrompt);
      toast.dismiss(`analyze-${repo.id}`);
      if (result) {
        setShowResults(true);
        toast.success(`分析完成`);
      }
    } catch (err) {
      toast.dismiss(`analyze-${repo.id}`);
      const errorMessage = err instanceof Error ? err.message : '分析失败';
      toast.error(errorMessage);
    }
  }, [aiSettings, lists, tags, analyzeSingleRepo]);

  const handleApplySuggestion = useCallback((suggestion: RepoSuggestion) => {
    // 1. 应用 Lists
    suggestion.recommendedLists.forEach(listName => {
      const list = lists?.find(l => l.name === listName);
      if (list) {
        addRepoToList({ listId: list.id, repoId: suggestion.repoId });
      }
    });

    // 2. 应用标签
    suggestion.suggestedTags.forEach(tagSuggestion => {
      let tag = tags.find(t => t.name === tagSuggestion.name);
      if (!tag) {
        tag = createTag(tagSuggestion.name, tagSuggestion.color);
      }
      addTagToRepo(suggestion.repoId, tag.id);
    });

    // 3. 应用备注（项目总结）
    if (suggestion.summary) {
      setRepoNote(suggestion.repoId, suggestion.summary);
    }

    toast.success(`已为 ${suggestion.repoName} 应用全部建议`);
  }, [tags, lists, createTag, addTagToRepo, addRepoToList, setRepoNote]);

  const handleApplyAll = useCallback(() => {
    // 本地映射表：跟踪本次批量操作中已创建的新标签，避免闭包陈旧引用导致重复创建
    const newTagsMap: Record<string, { id: string; name: string; color: string }> = {};
    
    suggestions.forEach(suggestion => {
      // 1. 应用 Lists
      suggestion.recommendedLists.forEach(listName => {
        const list = lists?.find(l => l.name === listName);
        if (list) {
          addRepoToList({ listId: list.id, repoId: suggestion.repoId });
        }
      });

      // 2. 应用标签
      suggestion.suggestedTags.forEach(tagSuggestion => {
        // 1. 先从现有 tags 查找
        let tag = tags.find(t => t.name === tagSuggestion.name);
        
        // 2. 再从本次已创建的新标签查找
        if (!tag && newTagsMap[tagSuggestion.name]) {
          tag = newTagsMap[tagSuggestion.name];
        }
        
        // 3. 都没找到，才创建新标签并记录
        if (!tag) {
          tag = createTag(tagSuggestion.name, tagSuggestion.color);
          newTagsMap[tagSuggestion.name] = tag;
        }
        
        addTagToRepo(suggestion.repoId, tag.id);
      });

      // 3. 应用备注（项目总结）
      if (suggestion.summary) {
        setRepoNote(suggestion.repoId, suggestion.summary);
      }
    });
    
    toast.success(`已为 ${suggestions.length} 个仓库应用全部建议`);
  }, [suggestions, tags, lists, createTag, addTagToRepo, addRepoToList, setRepoNote]);

  const handleClearSuggestions = useCallback(() => {
    resetAnalysis();
    setShowResults(false);
  }, [resetAnalysis]);

  const isLoadingData = isLoading || (selectedList && isLoadingList);

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">还没有 Star 任何仓库</p>
          <p className="text-sm mt-1">去 GitHub 上探索一些有趣的项目吧！</p>
        </div>
      </div>
    );
  }

  const totalCount = selectedList && listRepoIds 
    ? listRepoIds.length 
    : selectedTag 
      ? Object.values(repoMeta).filter(m => m.tags.includes(selectedTag)).length
      : selectedTopic
        ? stars.filter(r => r.topics?.includes(selectedTopic)).length
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
        onDeselectAll={handleDeselectAll}
        // AI Analysis props
        aiEnabled={aiSettings.enabled}
        uncategorizedCount={uncategorizedCount}
        isAnalyzing={progress.status === 'analyzing'}
        isPaused={isPaused}
        progress={{ completed: progress.completed, total: progress.total }}
        suggestions={suggestions}
        analysisDepth={aiSettings.analysisDepth}
        onAnalysisDepthChange={(depth) => updateSettings({ analysisDepth: depth })}
        onAnalyze={handleAnalyze}
        onPause={pauseAnalysis}
        onResume={resumeAnalysis}
        onCancel={resetAnalysis}
        onViewResults={() => setShowResults(true)}
        // AI Search props
        searchMode={searchMode}
        onSearchModeChange={handleSearchModeChange}
        isAISearching={isAISearching}
        onAISearch={handleAISearch}
      />

      {filteredRepos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>没有找到匹配的仓库</p>
          <p className="text-sm mt-1">试试其他搜索关键词或筛选条件</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="masonry-container">
          {filteredRepos.map(repo => (
            <div key={repo.id} className="masonry-item">
              <RepoCard 
                repo={repo} 
                isSelected={selectedRepos.has(repo.id)}
                onToggleSelect={() => toggleRepoSelection(repo.id)}
                onAnalyze={() => handleSingleAnalyze(repo)}
              />
            </div>
          ))}
        </div>
      ) : (
        <RepoList repos={filteredRepos} />
      )}

      <AIResultsSheet
        open={showResults}
        onOpenChange={setShowResults}
        suggestions={suggestions}
        onApply={handleApplySuggestion}
        onApplyAll={handleApplyAll}
        onClear={handleClearSuggestions}
        onFillNote={setRepoNote}
      />
    </div>
  );
}
