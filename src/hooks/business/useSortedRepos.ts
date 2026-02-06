import { useMemo } from "react";
import type { StarredRepo } from "@/types/github";
import type { SortDirection, SortOption } from "@/types/ui";

export function useSortedRepos(
  repos: StarredRepo[],
  sortField: SortOption,
  sortDirection: SortDirection,
  options?: { enabled?: boolean },
): StarredRepo[] {
  const enabled = options?.enabled ?? true;

  return useMemo(() => {
    if (!enabled) return repos;

    return [...repos].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "starred":
          comparison =
            new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime();
          break;
        case "stars":
          comparison = a.stargazers_count - b.stargazers_count;
          break;
        case "forks":
          comparison = a.forks_count - b.forks_count;
          break;
        case "updated":
          comparison =
            new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime();
          break;
        case "name":
          comparison = a.full_name.localeCompare(b.full_name);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [repos, sortField, sortDirection, enabled]);
}
