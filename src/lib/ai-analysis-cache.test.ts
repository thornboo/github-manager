import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_ANALYSIS_CACHE_MAX_ENTRIES,
  AI_ANALYSIS_CACHE_TTL_MS,
  clearAIAnalysisCache,
  getCachedSuggestion,
  setCachedSuggestion,
} from "@/lib/ai-analysis-cache";
import type { RepoSuggestion } from "@/types/ai";

function createSuggestion(repoId: number): RepoSuggestion {
  return {
    repoId,
    repoName: `owner/repo-${repoId}`,
    recommendedLists: [],
    suggestedTags: [],
    summary: "summary",
    reasoning: "reasoning",
  };
}

describe("ai-analysis-cache", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAIAnalysisCache();
  });

  it("should expire suggestions after TTL", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);

    setCachedSuggestion("ctx", createSuggestion(1));

    nowSpy.mockReturnValue(1_000 + AI_ANALYSIS_CACHE_TTL_MS + 1);
    expect(getCachedSuggestion("ctx", 1)).toBeNull();
  });

  it("should evict least recently used entries when over capacity", () => {
    const nowSpy = vi.spyOn(Date, "now");

    for (let i = 1; i <= AI_ANALYSIS_CACHE_MAX_ENTRIES; i += 1) {
      nowSpy.mockReturnValue(10_000 + i);
      setCachedSuggestion("ctx", createSuggestion(i));
    }

    // Touch repo-1 so repo-2 becomes the oldest recently used entry.
    nowSpy.mockReturnValue(20_000);
    expect(getCachedSuggestion("ctx", 1)?.repoId).toBe(1);

    nowSpy.mockReturnValue(30_000);
    setCachedSuggestion(
      "ctx",
      createSuggestion(AI_ANALYSIS_CACHE_MAX_ENTRIES + 1),
    );

    expect(getCachedSuggestion("ctx", 2)).toBeNull();
    expect(getCachedSuggestion("ctx", 1)?.repoId).toBe(1);
    expect(
      getCachedSuggestion("ctx", AI_ANALYSIS_CACHE_MAX_ENTRIES + 1)?.repoId,
    ).toBe(AI_ANALYSIS_CACHE_MAX_ENTRIES + 1);
  });

  it("should log warning on quota exceeded and keep app flow", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(() => setCachedSuggestion("ctx", createSuggestion(1))).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      "AI analysis cache quota exceeded, skip write",
    );
  });
});
