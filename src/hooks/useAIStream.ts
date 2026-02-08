import { useCallback, useRef, useState } from "react";
import type { AIProviderConfig, AnalysisDepth } from "@/types/ai";

export interface StreamProgress {
  current: number;
  total: number;
  repoId: number;
  repoName: string;
}

export interface StreamSuggestion {
  recommendedLists: string[];
  suggestedTags: Array<{ name: string; color: string; isNew: boolean }>;
  summary: string;
  reasoning: string;
}

export interface StreamResult {
  repoId: number;
  repoName: string;
  suggestion: StreamSuggestion;
}

export interface StreamError {
  repoId?: number;
  repoName?: string;
  message: string;
  recoverable: boolean;
}

export interface StreamComplete {
  success: boolean;
  totalProcessed: number;
  totalErrors: number;
}

interface UseAIStreamOptions {
  onProgress?: (progress: StreamProgress) => void;
  onResult?: (result: StreamResult) => void;
  onError?: (error: StreamError) => void;
  onComplete?: (complete: StreamComplete) => void;
}

export interface StreamParams {
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
  provider: AIProviderConfig;
  depth?: AnalysisDepth;
  systemPrompt?: string;
  userPrompt?: string;
}

interface UseAIStreamReturn {
  isStreaming: boolean;
  progress: StreamProgress | null;
  results: StreamResult[];
  errors: StreamError[];
  startStream: (params: StreamParams) => Promise<StreamComplete>;
  cancelStream: () => void;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

function parseJsonSafely(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function useAIStream(
  options: UseAIStreamOptions = {},
): UseAIStreamReturn {
  const { onProgress, onResult, onError, onComplete } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [results, setResults] = useState<StreamResult[]>([]);
  const [errors, setErrors] = useState<StreamError[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (params: StreamParams): Promise<StreamComplete> => {
      // 取消之前的流（如果有）
      cancelStream();

      const runId = (runIdRef.current += 1);

      // 重置状态
      setIsStreaming(true);
      setProgress(null);
      setResults([]);
      setErrors([]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let processed = 0;
      let errorCount = 0;
      let completeEvent: StreamComplete | null = null;
      let fatalErrorAlreadyReported = false;

      try {
        const response = await fetch("/api/analyze-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 忽略已过期的 run（例如：用户快速重复点击导致的竞态）
          if (runId !== runIdRef.current) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";

          for (const raw of lines) {
            const line = raw.trimEnd();

            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
              continue;
            }

            if (line.startsWith("data: ") && currentEvent) {
              const parsed = parseJsonSafely(line.slice(6));
              if (parsed) {
                const data = parsed as Record<string, unknown>;
                const type =
                  typeof data.type === "string" ? data.type : currentEvent;

                switch (type) {
                  case "progress": {
                    const p = data as unknown as StreamProgress & {
                      type?: unknown;
                    };
                    const normalized: StreamProgress = {
                      current: Number(p.current) || 0,
                      total: Number(p.total) || 0,
                      repoId: Number(p.repoId) || 0,
                      repoName:
                        typeof p.repoName === "string" ? p.repoName : "",
                    };
                    setProgress(normalized);
                    onProgress?.(normalized);
                    break;
                  }
                  case "result": {
                    const r = data as unknown as StreamResult & {
                      type?: unknown;
                    };
                    const normalized: StreamResult = {
                      repoId: Number(r.repoId) || 0,
                      repoName:
                        typeof r.repoName === "string" ? r.repoName : "",
                      suggestion: {
                        recommendedLists:
                          r.suggestion?.recommendedLists?.filter(Boolean) || [],
                        suggestedTags:
                          r.suggestion?.suggestedTags?.filter(Boolean) || [],
                        summary:
                          typeof r.suggestion?.summary === "string"
                            ? r.suggestion.summary
                            : "",
                        reasoning:
                          typeof r.suggestion?.reasoning === "string"
                            ? r.suggestion.reasoning
                            : "",
                      },
                    };
                    processed += 1;
                    setResults((prev) => [...prev, normalized]);
                    onResult?.(normalized);
                    break;
                  }
                  case "error": {
                    const e = data as unknown as StreamError & {
                      type?: unknown;
                    };
                    const normalized: StreamError = {
                      repoId:
                        typeof e.repoId === "number" ? e.repoId : undefined,
                      repoName:
                        typeof e.repoName === "string" ? e.repoName : undefined,
                      message:
                        typeof e.message === "string" && e.message
                          ? e.message
                          : "Stream error",
                      recoverable: Boolean(e.recoverable),
                    };
                    errorCount += 1;
                    setErrors((prev) => [...prev, normalized]);
                    onError?.(normalized);
                    // 不可恢复错误：直接中断本次流
                    if (normalized.recoverable === false) {
                      fatalErrorAlreadyReported = true;
                      throw new Error(normalized.message || "Stream error");
                    }
                    break;
                  }
                  case "complete": {
                    const c = data as unknown as StreamComplete & {
                      type?: unknown;
                    };
                    const normalized: StreamComplete = {
                      success: Boolean(c.success),
                      totalProcessed: Number(c.totalProcessed) || 0,
                      totalErrors: Number(c.totalErrors) || 0,
                    };
                    completeEvent = normalized;
                    onComplete?.(normalized);
                    break;
                  }
                }
              }
              currentEvent = "";
            }
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        if (!fatalErrorAlreadyReported) {
          const streamError: StreamError = {
            message: error instanceof Error ? error.message : "Stream failed",
            recoverable: false,
          };
          setErrors((prev) => [...prev, streamError]);
          onError?.(streamError);
        }
        throw error;
      } finally {
        if (runId === runIdRef.current) {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      }

      return (
        completeEvent ?? {
          success: errorCount === 0,
          totalProcessed: processed,
          totalErrors: errorCount,
        }
      );
    },
    [cancelStream, onComplete, onError, onProgress, onResult],
  );

  return {
    isStreaming,
    progress,
    results,
    errors,
    startStream,
    cancelStream,
  };
}
