import { API_DEFAULTS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";

interface GitHubSearchResponse<T> {
  total_count: number;
  items: T[];
}

export async function fetchSearchItems<T>(
  client: GitHubApiClient,
  query: string,
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  const perPage = API_DEFAULTS.perPage;

  while (true) {
    const data = await client.rest<GitHubSearchResponse<T>>(
      `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`,
    );

    if (data.items.length === 0) {
      break;
    }

    allItems.push(...data.items);

    if (data.items.length < perPage || allItems.length >= data.total_count) {
      break;
    }

    page += 1;
  }

  return allItems;
}
