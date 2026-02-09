import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamParams } from "@/hooks/useAIStream";
import type { StarredRepo } from "@/types/github";
import type { RepoTag } from "@/types/local";

const startStreamMock = vi.fn<
  (params: StreamParams) => Promise<{
    success: boolean;
    totalProcessed: number;
    totalErrors: number;
  }>
>();
const cancelStreamMock = vi.fn();

vi.mock("@/hooks/useAIStream", () => {
  return {
    useAIStream: () => ({
      startStream: startStreamMock,
      cancelStream: cancelStreamMock,
    }),
  };
});

import { useAIAnalysis } from "@/hooks/business/useAIAnalysis";

describe("useAIAnalysis progress guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    startStreamMock.mockReset();
    cancelStreamMock.mockReset();
    localStorage.clear();
  });

  it("fails fast when stream request ends without any progress", async () => {
    startStreamMock.mockResolvedValue({
      success: true,
      totalProcessed: 0,
      totalErrors: 0,
    });

    const provider = {
      baseUrl: "https://example.com",
      apiKey: "test",
      model: "gpt-test",
      requestFormat: "openai" as const,
    };

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
    ];

    const existingLists = [{ id: "list-1", name: "List 1" }];
    const tags: RepoTag[] = [{ id: "tag-1", name: "Tag 1", color: "#000000" }];

    const { result } = renderHook(() => useAIAnalysis());

    await act(async () => {
      await expect(
        result.current.analyzeRepos(
          repos,
          existingLists,
          tags,
          provider,
          "simple",
        ),
      ).rejects.toThrow("流式分析未返回任何进度");
    });

    expect(startStreamMock).toHaveBeenCalledTimes(1);
    expect(result.current.progress.status).toBe("error");
    expect(result.current.progress.error).toContain("流式分析未返回任何进度");
  });
});
