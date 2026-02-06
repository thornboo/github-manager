import { useEffect, useState } from "react";
import type { SortDirection, SortOption } from "@/types/ui";

const SORT_FIELD_MAP: Record<string, SortOption> = {
  starred: "starred",
  stars: "stars",
  updated: "updated",
  name: "name",
  forks: "forks",
};

export function useStarsDashboardUrlState(searchParams: URLSearchParams) {
  const [language, setLanguage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortOption>("starred");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // URL 参数支持：用于 Dashboard/图表点击跳转到 /repos?language=xxx /repos?sort=stars&direction=desc
  useEffect(() => {
    setLanguage(searchParams.get("language"));

    const sortParamRaw = searchParams.get("sort");
    if (sortParamRaw) {
      const sortParam =
        sortParamRaw === "starred_at" ? "starred" : sortParamRaw;
      const field = SORT_FIELD_MAP[sortParam];
      if (field) {
        setSortField(field);
      }

      const directionParam = searchParams.get("direction");
      if (directionParam === "asc" || directionParam === "desc") {
        setSortDirection(directionParam);
      }
    }
  }, [searchParams]);

  return {
    language,
    setLanguage,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
  };
}
