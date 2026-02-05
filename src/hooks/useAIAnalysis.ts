import { useState, useCallback, useRef, useEffect } from 'react';
import { StarredRepo } from '@/types/github';
import { RepoTag } from '@/hooks/useLocalData';
import { postJson } from '@/lib/api';

export type AnalysisDepth = 'quick' | 'simple' | 'deep';

export interface RepoSuggestion {
  repoId: number;
  repoName: string;
  recommendedLists: string[];
  suggestedTags: Array<{
    name: string;
    color: string;
    isNew: boolean;
  }>;
  reasoning: string;
  summary: string;  // AI-generated project summary
}

type RepoSuggestionPayload = Omit<RepoSuggestion, 'repoName'>;

export interface AnalysisProgress {
  total: number;
  completed: number;
  status: 'idle' | 'analyzing' | 'paused' | 'completed' | 'error';
  error?: string;
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: 'openai' | 'custom';
}

interface AnalyzeRequest {
  repos: Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    topics: string[];
  }>;
  existingLists: Array<{ id: string; name: string }>;
  existingTags: Array<{ id: string; name: string }>;
  provider: ProviderConfig;
  depth: AnalysisDepth;
  systemPrompt?: string;
  userPrompt?: string;
}

const BATCH_SIZE = 10;
const PROGRESS_INTERVAL_MS = 800; // 每 0.8 秒更新一次模拟进度

export function useAIAnalysis() {
  const [progress, setProgress] = useState<AnalysisProgress>({
    total: 0,
    completed: 0,
    status: 'idle',
  });
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  
  // Use refs to control pause/cancel state
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const progressIntervalRef = useRef<number | null>(null);

  // 清理进度模拟定时器
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => clearProgressInterval();
  }, [clearProgressInterval]);

  const analyzeRepos = useCallback(async (
    repos: StarredRepo[],
    existingLists: Array<{ id: string; name: string }>,
    existingTags: RepoTag[],
    provider: ProviderConfig,
    depth: AnalysisDepth = 'simple',
    systemPrompt?: string,
    userPrompt?: string
  ): Promise<RepoSuggestion[]> => {
    if (repos.length === 0) {
      return [];
    }

    // Reset control refs
    pausedRef.current = false;
    cancelledRef.current = false;
    setIsPaused(false);
    clearProgressInterval();

    setProgress({ total: repos.length, completed: 0, status: 'analyzing' });
    setSuggestions([]);

    const allSuggestions: RepoSuggestion[] = [];
    const batches = Math.ceil(repos.length / BATCH_SIZE);

    try {
      for (let i = 0; i < batches; i++) {
        // Check if cancelled
        if (cancelledRef.current) {
          setProgress(prev => ({ ...prev, status: 'idle' }));
          return allSuggestions;
        }

        // Wait while paused
        while (pausedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200));
          if (cancelledRef.current) {
            setProgress(prev => ({ ...prev, status: 'idle' }));
            return allSuggestions;
          }
        }

        const batchStart = i * BATCH_SIZE;
        const batchEnd = Math.min((i + 1) * BATCH_SIZE, repos.length);
        const batchRepos = repos.slice(batchStart, batchEnd);

        // 启动模拟进度：在 API 调用期间逐渐增加进度
        let simulatedProgress = batchStart;
        clearProgressInterval();
        progressIntervalRef.current = window.setInterval(() => {
          // 最多模拟到 batchEnd - 1，留一个给真实完成
          if (simulatedProgress < batchEnd - 1 && !pausedRef.current) {
            simulatedProgress++;
            setProgress(prev => ({
              ...prev,
              completed: simulatedProgress,
            }));
          }
        }, PROGRESS_INTERVAL_MS);
        
        const request: AnalyzeRequest = {
          repos: batchRepos.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            language: repo.language,
            topics: repo.topics,
          })),
          existingLists,
          existingTags: existingTags.map(t => ({ id: t.id, name: t.name })),
          provider,
          depth,
          systemPrompt,
          userPrompt,
        };

        // 清除模拟定时器
        clearProgressInterval();
        
        const data = await postJson<{ suggestions?: RepoSuggestionPayload[] }>('/api/analyze-repos', request);

        if (data?.suggestions) {
          const batchSuggestions: RepoSuggestion[] = data.suggestions.map((s) => ({
            ...s,
            repoName: batchRepos.find(r => r.id === s.repoId)?.full_name || '',
          }));
          allSuggestions.push(...batchSuggestions);
          setSuggestions(prev => [...prev, ...batchSuggestions]);
        }

        // 设置真实完成进度
        setProgress(prev => ({
          ...prev,
          completed: batchEnd,
        }));
      }

      setProgress(prev => ({ ...prev, status: 'completed' }));
      return allSuggestions;
    } catch (error) {
      clearProgressInterval();
      const errorMessage = error instanceof Error ? error.message : '分析失败';
      setProgress(prev => ({ ...prev, status: 'error', error: errorMessage }));
      throw error;
    }
  }, [clearProgressInterval]);

  const analyzeSingleRepo = useCallback(async (
    repo: StarredRepo,
    existingLists: Array<{ id: string; name: string }>,
    existingTags: RepoTag[],
    provider: ProviderConfig,
    depth: AnalysisDepth = 'simple',
    systemPrompt?: string,
    userPrompt?: string
  ): Promise<RepoSuggestion | null> => {
    const results = await analyzeRepos([repo], existingLists, existingTags, provider, depth, systemPrompt, userPrompt);
    return results[0] || null;
  }, [analyzeRepos]);

  const pauseAnalysis = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    setProgress(prev => ({ ...prev, status: 'paused' }));
  }, []);

  const resumeAnalysis = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    setProgress(prev => ({ ...prev, status: 'analyzing' }));
  }, []);

  const resetAnalysis = useCallback(() => {
    clearProgressInterval();
    cancelledRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setProgress({ total: 0, completed: 0, status: 'idle' });
    setSuggestions([]);
  }, [clearProgressInterval]);

  return {
    progress,
    suggestions,
    isPaused,
    analyzeRepos,
    analyzeSingleRepo,
    pauseAnalysis,
    resumeAnalysis,
    resetAnalysis,
  };
}
