import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import { useAISearch } from "@/hooks/useAISearch";
import { useAISettings } from "@/hooks/useAISettings";
import type { AnalysisDepth, AnalysisScope, RepoSuggestion } from "@/types/ai";
import type { StarList, StarredRepo } from "@/types/github";
import type { RepoMeta, RepoTag } from "@/types/local";

export function useStarsDashboardAI(params: {
  stars: StarredRepo[] | undefined;
  repoMeta: Record<number, RepoMeta>;
  tags: RepoTag[];
  lists: StarList[] | undefined;
  selectedRepos: Set<number>;
  addRepoToList: (input: {
    listId: string;
    repoId: number;
    repoFullName?: string;
  }) => void;
  createTag: (name: string, color?: string) => RepoTag;
  addTagToRepo: (repoId: number, tagId: string) => void;
  setRepoNote: (repoId: number, note: string) => void;
}) {
  const {
    stars,
    repoMeta,
    tags,
    lists,
    selectedRepos,
    addRepoToList,
    createTag,
    addTagToRepo,
    setRepoNote,
  } = params;

  const {
    settings: aiSettings,
    updateSettings,
    setLastAnalyzedAt,
  } = useAISettings();
  const {
    progress,
    suggestions,
    analyzeRepos,
    analyzeSingleRepo,
    resetAnalysis,
    pauseAnalysis,
    resumeAnalysis,
    isPaused,
  } = useAIAnalysis();
  const {
    isSearching: isAISearching,
    searchResults,
    aiSearch,
    clearSearch,
  } = useAISearch();

  const [showResults, setShowResults] = useState(false);

  const runAISearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !stars) return;

      if (!aiSettings.enabled) {
        toast.error("请先在设置中启用并配置 AI 服务");
        return;
      }

      if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
        toast.error("请先在设置中配置 AI 服务商");
        return;
      }

      try {
        await aiSearch(query, stars, repoMeta, tags, [], aiSettings.provider);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "AI 搜索失败";
        toast.error(errorMessage);
      }
    },
    [aiSearch, aiSettings, repoMeta, stars, tags],
  );

  const analyze = useCallback(
    async (scope: AnalysisScope, depth: AnalysisDepth) => {
      if (!aiSettings.enabled) {
        toast.error("请先在设置中启用并配置 AI 服务");
        return;
      }

      if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
        toast.error("请先在设置中配置 AI 服务商");
        return;
      }

      let reposToAnalyze: StarredRepo[] = [];

      switch (scope) {
        case "all":
          reposToAnalyze = stars || [];
          break;
        case "uncategorized":
          reposToAnalyze = (stars || []).filter((repo) => {
            const meta = repoMeta[repo.id];
            return !meta?.tags || meta.tags.length === 0;
          });
          break;
        case "selected":
          reposToAnalyze = (stars || []).filter((repo) =>
            selectedRepos.has(repo.id),
          );
          break;
      }

      if (reposToAnalyze.length === 0) {
        toast.warning("没有可分析的仓库");
        return;
      }

      const existingLists =
        lists?.map((l) => ({ id: l.id, name: l.name })) || [];

      try {
        await analyzeRepos(
          reposToAnalyze,
          existingLists,
          tags,
          aiSettings.provider,
          depth,
          aiSettings.systemPrompt,
          aiSettings.userPrompt,
        );
        setLastAnalyzedAt(new Date());
        setShowResults(true);
        toast.success("分析完成！");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "分析失败";
        toast.error(errorMessage);
      }
    },
    [
      aiSettings,
      analyzeRepos,
      lists,
      repoMeta,
      selectedRepos,
      setLastAnalyzedAt,
      stars,
      tags,
    ],
  );

  const analyzeSingle = useCallback(
    async (repo: StarredRepo) => {
      if (!aiSettings.enabled) {
        toast.error("请先在设置中启用并配置 AI 服务");
        return;
      }

      if (!aiSettings.provider.baseUrl || !aiSettings.provider.apiKey) {
        toast.error("请先在设置中配置 AI 服务商");
        return;
      }

      const existingLists =
        lists?.map((l) => ({ id: l.id, name: l.name })) || [];

      try {
        toast.loading("正在分析...", { id: `analyze-${repo.id}` });
        const result = await analyzeSingleRepo(
          repo,
          existingLists,
          tags,
          aiSettings.provider,
          aiSettings.analysisDepth,
          aiSettings.systemPrompt,
          aiSettings.userPrompt,
        );
        toast.dismiss(`analyze-${repo.id}`);
        if (result) {
          setShowResults(true);
          toast.success("分析完成");
        }
      } catch (err) {
        toast.dismiss(`analyze-${repo.id}`);
        const errorMessage = err instanceof Error ? err.message : "分析失败";
        toast.error(errorMessage);
      }
    },
    [aiSettings, analyzeSingleRepo, lists, tags],
  );

  const applySuggestion = useCallback(
    (suggestion: RepoSuggestion) => {
      // 1. 应用 Lists
      suggestion.recommendedLists.forEach((listName) => {
        const list = lists?.find((l) => l.name === listName);
        if (list) {
          const repoFullName =
            stars?.find((r) => r.id === suggestion.repoId)?.full_name ||
            suggestion.repoName;
          addRepoToList({
            listId: list.id,
            repoId: suggestion.repoId,
            repoFullName,
          });
        }
      });

      // 2. 应用标签
      suggestion.suggestedTags.forEach((tagSuggestion) => {
        let tag = tags.find((t) => t.name === tagSuggestion.name);
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
    },
    [addRepoToList, addTagToRepo, createTag, lists, setRepoNote, stars, tags],
  );

  const applyAll = useCallback(() => {
    // 本地映射表：跟踪本次批量操作中已创建的新标签，避免闭包陈旧引用导致重复创建
    const newTagsMap: Record<
      string,
      { id: string; name: string; color: string }
    > = {};

    suggestions.forEach((suggestion) => {
      // 1. 应用 Lists
      suggestion.recommendedLists.forEach((listName) => {
        const list = lists?.find((l) => l.name === listName);
        if (list) {
          const repoFullName =
            stars?.find((r) => r.id === suggestion.repoId)?.full_name ||
            suggestion.repoName;
          addRepoToList({
            listId: list.id,
            repoId: suggestion.repoId,
            repoFullName,
          });
        }
      });

      // 2. 应用标签
      suggestion.suggestedTags.forEach((tagSuggestion) => {
        // 1. 先从现有 tags 查找
        let tag = tags.find((t) => t.name === tagSuggestion.name);

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
  }, [
    addRepoToList,
    addTagToRepo,
    createTag,
    lists,
    setRepoNote,
    stars,
    suggestions,
    tags,
  ]);

  const clearSuggestions = useCallback(() => {
    resetAnalysis();
    setShowResults(false);
  }, [resetAnalysis]);

  return {
    aiSettings,
    updateSettings,
    progress,
    suggestions,
    isPaused,
    pauseAnalysis,
    resumeAnalysis,
    resetAnalysis,
    showResults,
    setShowResults,
    isAISearching,
    searchResults,
    clearSearch,
    runAISearch,
    analyze,
    analyzeSingle,
    applySuggestion,
    applyAll,
    clearSuggestions,
  };
}
