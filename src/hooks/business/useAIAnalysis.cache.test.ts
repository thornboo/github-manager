import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamParams } from "@/hooks/useAIStream";
import {
  buildAIAnalysisContextHash,
  setCachedSuggestion,
} from "@/lib/ai-analysis-cache";
import type { StarredRepo } from "@/types/github";
import type { RepoTag } from "@/types/local";

const startStreamMock = vi.fn();
const cancelStreamMock = vi.fn();

vi.mock("@/hooks/useAIStream", () => {
  return {
    useAIStream: (options: unknown) => {
      const opts = options as {
        onResult?: (result: {
          repoId: number;
          repoName: string;
          suggestion: {
            recommendedLists: string[];
            suggestedTags: Array<{
              name: string;
              color: string;
              isNew: boolean;
            }>;
            summary: string;
            reasoning: string;
          };
        }) => void;
      };

      return {
        startStream: async (params: StreamParams) => {
          startStreamMock(params);
          for (const repo of params.repos) {
            opts.onResult?.({
              repoId: repo.id,
              repoName: repo.full_name,
              suggestion: {
                recommendedLists: [],
                suggestedTags: [],
                summary: "ok",
                reasoning: "ok",
              },
            });
          }
          return {
            success: true,
            totalProcessed: params.repos.length,
            totalErrors: 0,
          };
        },
        cancelStream: cancelStreamMock,
      };
    },
  };
});

import { useAIAnalysis } from "@/hooks/useAIAnalysis";

describe("useAIAnalysis (cache)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    startStreamMock.mockReset();
    cancelStreamMock.mockReset();
    localStorage.clear();
  });

  it("should use cached suggestions and only stream remaining repos", async () => {
    const provider = {
      baseUrl: "https://example.com",
      apiKey: "test",
      model: "gpt-test",
      requestFormat: "openai" as const,
    };
    const depth = "simple" as const;
    const systemPrompt = "";
    const userPrompt = "test";

    const repos: StarredRepo[] = [
      {
        id: 1,
        name: "repo1",
        full_name: "test/repo1",
        owner: { login: "test", avatar_url: "" },
        html_url: "https://example.com/repo1",
        description: null,
        stargazers_count: 0,
        forks_count: 0,
        language: "TypeScript",
        topics: [],
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
        pushed_at: "2020-01-01T00:00:00Z",
        homepage: null,
        starred_at: "2020-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "repo2",
        full_name: "test/repo2",
        owner: { login: "test", avatar_url: "" },
        html_url: "https://example.com/repo2",
        description: null,
        stargazers_count: 0,
        forks_count: 0,
        language: "TypeScript",
        topics: [],
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
        pushed_at: "2020-01-01T00:00:00Z",
        homepage: null,
        starred_at: "2020-01-01T00:00:00Z",
      },
    ];

    const existingLists = [{ id: "list-1", name: "List 1" }];
    const tags: RepoTag[] = [{ id: "tag-1", name: "Tag 1", color: "#000000" }];

    const contextHash = buildAIAnalysisContextHash({
      provider: {
        baseUrl: provider.baseUrl,
        model: provider.model,
        requestFormat: provider.requestFormat,
      },
      depth,
      systemPrompt,
      userPrompt,
      existingLists,
      existingTags: tags.map((t) => ({ id: t.id, name: t.name })),
    });

    setCachedSuggestion(contextHash, {
      repoId: 1,
      repoName: "test/repo1",
      recommendedLists: ["List 1"],
      suggestedTags: [],
      summary: "cached",
      reasoning: "cached",
    });

    const { result } = renderHook(() => useAIAnalysis());

    await act(async () => {
      const suggestions = await result.current.analyzeRepos(
        repos,
        existingLists,
        tags,
        provider,
        depth,
        systemPrompt,
        userPrompt,
      );

      expect(suggestions.map((s) => s.repoId).sort()).toEqual([1, 2]);
    });

    expect(startStreamMock).toHaveBeenCalledTimes(1);
    const params = startStreamMock.mock.calls[0]?.[0] as StreamParams;
    expect(params.repos.map((r) => r.id)).toEqual([2]);

    expect(result.current.progress.status).toBe("completed");
    expect(result.current.progress.completed).toBe(2);
    expect(result.current.progress.total).toBe(2);
  });
});
