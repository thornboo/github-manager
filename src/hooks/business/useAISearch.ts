import { useState, useCallback } from "react";
import { StarredRepo } from "@/types/github";
import type { RepoMeta } from "@/types/local";
import type { AIProviderConfig } from "@/types/ai";
import { postJson } from "@/lib/api";

export interface SearchMatch {
  repoId: number;
  relevance: "high" | "medium" | "low";
  reason: string;
}

export function useAISearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchMatch[] | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);

  const aiSearch = useCallback(
    async (
      query: string,
      repos: StarredRepo[],
      repoMeta: Record<number, RepoMeta>,
      tags: Array<{ id: string; name: string }>,
      lists: Array<{ id: string; name: string; repos: number[] }>,
      provider: AIProviderConfig,
    ): Promise<SearchMatch[]> => {
      if (!query.trim()) {
        setSearchResults(null);
        return [];
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const reposWithMeta = repos.map((repo) => {
          const meta = repoMeta[repo.id];
          const localTagNames =
            meta?.tags
              .map((tagId) => tags.find((t) => t.id === tagId)?.name)
              .filter(Boolean) || [];
          const repoLists = lists
            .filter((l) => l.repos.includes(repo.id))
            .map((l) => l.name);

          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            language: repo.language,
            topics: repo.topics || [],
            localTags: localTagNames,
            note: meta?.note || null,
            lists: repoLists,
          };
        });

        const data = await postJson<{ matches?: SearchMatch[] }>(
          "/api/ai-search",
          {
            query,
            repos: reposWithMeta,
            provider,
          },
        );

        const matches = data?.matches || [];
        setSearchResults(matches);
        return matches;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "搜索失败";
        setSearchError(errorMessage);
        setSearchResults(null);
        throw err;
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchError(null);
  }, []);

  return {
    isSearching,
    searchResults,
    searchError,
    aiSearch,
    clearSearch,
  };
}
