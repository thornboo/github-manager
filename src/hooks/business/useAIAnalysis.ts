import { useCallback, useEffect, useRef, useState } from "react";
import type { StarredRepo } from "@/types/github";
import type { RepoTag } from "@/types/local";
import type {
  AIProviderConfig,
  AnalysisDepth,
  RepoSuggestion,
} from "@/types/ai";
import {
  buildAIAnalysisContextHash,
  getCachedSuggestion,
  setCachedSuggestion,
} from "@/lib/ai-analysis-cache";
import {
  useAIStream,
  type StreamError,
  type StreamResult,
} from "@/hooks/useAIStream";

export type { AnalysisDepth, RepoSuggestion } from "@/types/ai";

export interface AnalysisProgress {
  total: number;
  completed: number;
  status: "idle" | "analyzing" | "paused" | "completed" | "error";
  error?: string;
}

export class CancelledError extends Error {
  constructor(message = "Cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

export function useAIAnalysis() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    total: 0,
    completed: 0,
    status: "idle",
  });
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [errors, setErrors] = useState<StreamError[]>([]);

  // 控制暂停/取消
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const completedRepoIdsRef = useRef<Set<number>>(new Set());
  const suggestionsRef = useRef<RepoSuggestion[]>([]);
  const cacheContextHashRef = useRef<string | null>(null);
  // 防止并发分析的互斥锁
  const analysisRunIdRef = useRef(0);

  const handleStreamResult = useCallback((result: StreamResult) => {
    if (cancelledRef.current) return;

    const repoId = result.repoId;
    if (!Number.isFinite(repoId)) return;

    const completed = completedRepoIdsRef.current;
    if (completed.has(repoId)) return;

    completed.add(repoId);

    const suggestion: RepoSuggestion = {
      repoId,
      repoName: result.repoName,
      recommendedLists: result.suggestion.recommendedLists || [],
      suggestedTags: result.suggestion.suggestedTags || [],
      summary: result.suggestion.summary || "",
      reasoning: result.suggestion.reasoning || "",
    };

    suggestionsRef.current = [...suggestionsRef.current, suggestion];
    setSuggestions((prev) => [...prev, suggestion]);
    setProgress((prev) => ({
      ...prev,
      completed: completed.size,
    }));

    const contextHash = cacheContextHashRef.current;
    if (contextHash) {
      setCachedSuggestion(contextHash, suggestion);
    }
  }, []);

  const handleStreamError = useCallback((error: StreamError) => {
    if (cancelledRef.current) return;

    setErrors((prev) => [...prev, error]);

    const repoId = error.repoId;
    if (typeof repoId !== "number") return;
    if (!Number.isFinite(repoId)) return;

    const completed = completedRepoIdsRef.current;
    if (completed.has(repoId)) return;
    completed.add(repoId);
    setProgress((prev) => ({
      ...prev,
      completed: completed.size,
    }));
  }, []);

  const { startStream, cancelStream } = useAIStream({
    onResult: handleStreamResult,
    onError: handleStreamError,
  });

  // 组件卸载时中止流，避免泄露未完成的请求
  useEffect(() => {
    return () => cancelStream();
  }, [cancelStream]);

  const analyzeRepos = useCallback(
    async (
      repos: StarredRepo[],
      existingLists: Array<{ id: string; name: string }>,
      existingTags: RepoTag[],
      provider: AIProviderConfig,
      depth: AnalysisDepth = "simple",
      systemPrompt?: string,
      userPrompt?: string,
    ): Promise<RepoSuggestion[]> => {
      if (repos.length === 0) {
        return [];
      }

      // 生成唯一的 runId，取消之前可能正在进行的分析
      const currentRunId = ++analysisRunIdRef.current;
      cancelStream();

      // 初始化本轮分析状态
      pausedRef.current = false;
      cancelledRef.current = false;
      setIsPaused(false);
      completedRepoIdsRef.current = new Set();
      suggestionsRef.current = [];
      cacheContextHashRef.current = buildAIAnalysisContextHash({
        provider: {
          baseUrl: provider.baseUrl,
          model: provider.model,
          requestFormat: provider.requestFormat,
        },
        depth,
        systemPrompt,
        userPrompt,
        existingLists,
        existingTags: existingTags.map((t) => ({ id: t.id, name: t.name })),
      });
      setErrors([]);
      setProgress({
        total: repos.length,
        completed: 0,
        status: "analyzing",
      });
      setSuggestions([]);

      // 先从缓存中填充已分析结果，减少重复调用
      const contextHash = cacheContextHashRef.current;
      if (contextHash) {
        const cachedSuggestions = repos
          .map((repo) => getCachedSuggestion(contextHash, repo.id))
          .filter(Boolean) as RepoSuggestion[];

        if (cachedSuggestions.length > 0) {
          completedRepoIdsRef.current = new Set(
            cachedSuggestions.map((s) => s.repoId),
          );
          suggestionsRef.current = cachedSuggestions;
          setSuggestions(cachedSuggestions);
          setProgress((prev) => ({
            ...prev,
            completed: cachedSuggestions.length,
          }));
        }
      }

      try {
        while (true) {
          // 检查是否有新的分析启动，如果是则退出当前分析
          if (currentRunId !== analysisRunIdRef.current) {
            throw new CancelledError("Superseded by new analysis");
          }

          if (cancelledRef.current) {
            throw new CancelledError();
          }

          while (pausedRef.current) {
            await delay(200);
            if (cancelledRef.current) {
              throw new CancelledError();
            }
          }

          const remaining = repos.filter(
            (r) => !completedRepoIdsRef.current.has(r.id),
          );

          if (remaining.length === 0) {
            break;
          }

          const completedBeforeStream = completedRepoIdsRef.current.size;

          try {
            await startStream({
              repos: remaining.map((repo) => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                language: repo.language,
                topics: repo.topics,
              })),
              existingLists,
              existingTags: existingTags.map((t) => ({
                id: t.id,
                name: t.name,
              })),
              provider,
              depth,
              systemPrompt,
              userPrompt,
            });

            // 保护机制：若本轮流式请求没有任何进度增量，则立刻失败，避免 while 重试死循环。
            if (completedRepoIdsRef.current.size <= completedBeforeStream) {
              throw new Error("流式分析未返回任何进度，请检查服务端连接后重试");
            }
          } catch (error) {
            // 暂停/取消：startStream 会因为 AbortError 中断
            if (isAbortError(error)) {
              // 检查是否被新的分析取代
              if (currentRunId !== analysisRunIdRef.current) {
                throw new CancelledError("Superseded by new analysis");
              }
              if (cancelledRef.current) {
                throw new CancelledError();
              }
              continue;
            }

            const errorMessage =
              error instanceof Error ? error.message : "分析失败";
            setProgress((prev) => ({
              ...prev,
              status: "error",
              error: errorMessage,
            }));
            throw error;
          }
        }

        setProgress((prev) => ({
          ...prev,
          completed: prev.total,
          status: "completed",
        }));

        return suggestionsRef.current;
      } catch (error) {
        if (error instanceof CancelledError) {
          // 取消由 cancelAnalysis / resetAnalysis 负责更新 UI 状态
          throw error;
        }
        throw error;
      }
    },
    [startStream, cancelStream],
  );

  const analyzeSingleRepo = useCallback(
    async (
      repo: StarredRepo,
      existingLists: Array<{ id: string; name: string }>,
      existingTags: RepoTag[],
      provider: AIProviderConfig,
      depth: AnalysisDepth = "simple",
      systemPrompt?: string,
      userPrompt?: string,
    ): Promise<RepoSuggestion | null> => {
      const results = await analyzeRepos(
        [repo],
        existingLists,
        existingTags,
        provider,
        depth,
        systemPrompt,
        userPrompt,
      );
      return results[0] || null;
    },
    [analyzeRepos],
  );

  const pauseAnalysis = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    setProgress((prev) => ({ ...prev, status: "paused" }));
    cancelStream();
  }, [cancelStream]);

  const resumeAnalysis = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    setProgress((prev) => ({ ...prev, status: "analyzing" }));
  }, []);

  const resetAnalysis = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    cancelStream();

    completedRepoIdsRef.current = new Set();
    suggestionsRef.current = [];
    cacheContextHashRef.current = null;

    setProgress({ total: 0, completed: 0, status: "idle" });
    setSuggestions([]);
    setErrors([]);
  }, [cancelStream]);

  const cancelAnalysis = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    cancelStream();
    setProgress((prev) => ({ ...prev, status: "idle" }));
  }, [cancelStream]);

  return {
    progress,
    suggestions,
    isPaused,
    errors,
    analyzeRepos,
    analyzeSingleRepo,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
    resetAnalysis,
  };
}
