import { useMemo } from "react";
import type { StarredRepo } from "@/types/github";
import type { RepoMeta } from "@/types/local";
import type { SearchMatch } from "@/hooks/business/useAISearch";
import type { SearchMode } from "@/types/ui";
import { filterRepos } from "@/hooks/api/useStars";

export function useFilteredRepos(options: {
  repos: StarredRepo[];
  selectedList: string | null;
  listRepoIds: number[] | undefined;
  selectedTag: string | null;
  repoMeta: Record<number, RepoMeta>;
  selectedTopic: string | null;
  search: string;
  language: string | null;
  searchMode: SearchMode;
  searchResults: SearchMatch[] | null;
}): StarredRepo[] {
  const {
    repos,
    selectedList,
    listRepoIds,
    selectedTag,
    repoMeta,
    selectedTopic,
    search,
    language,
    searchMode,
    searchResults,
  } = options;

  return useMemo(() => {
    let next = repos;

    // Filter by list if selected
    if (selectedList && listRepoIds) {
      next = next.filter((repo) => listRepoIds.includes(repo.id));
    }

    // Filter by local tag if selected
    if (selectedTag) {
      next = next.filter((repo) => {
        const meta = repoMeta[repo.id];
        return meta?.tags.includes(selectedTag);
      });
    }

    // Filter by GitHub topic if selected
    if (selectedTopic) {
      next = next.filter((repo) => repo.topics?.includes(selectedTopic));
    }

    // Apply AI search results filter if in AI mode and has results
    if (searchMode === "ai" && searchResults && searchResults.length > 0) {
      const matchedIds = new Set(searchResults.map((r) => r.repoId));
      next = next.filter((repo) => matchedIds.has(repo.id));

      // Sort by relevance
      const relevanceOrder = { high: 0, medium: 1, low: 2 } as const;
      next = [...next].sort((a, b) => {
        const aMatch = searchResults.find((r) => r.repoId === a.id);
        const bMatch = searchResults.find((r) => r.repoId === b.id);
        const aOrder = aMatch ? relevanceOrder[aMatch.relevance] : 3;
        const bOrder = bMatch ? relevanceOrder[bMatch.relevance] : 3;
        return aOrder - bOrder;
      });

      return next;
    }

    return filterRepos(next, search, language);
  }, [
    repos,
    selectedList,
    listRepoIds,
    selectedTag,
    repoMeta,
    selectedTopic,
    searchMode,
    searchResults,
    search,
    language,
  ]);
}
