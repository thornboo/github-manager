import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubIssue } from "@/types/github";
import { API_DEFAULTS, STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";
import { fetchAllIssuesGraphQL } from "@/hooks/api/useIssuesGraphQL";

// 兼容旧导出路径：逐步迁移到 lib/github-utils
export { getRepoNameFromUrl } from "@/lib/github-utils";

export type IssueSource = "created" | "involved";

// 默认启用 GraphQL；如需强制回退 REST，可设置 VITE_USE_GRAPHQL=false。
const USE_GRAPHQL = import.meta.env.VITE_USE_GRAPHQL !== "false";

export function getCachedIssues():
  | { created: GitHubIssue[]; involved: GitHubIssue[] }
  | undefined {
  try {
    const created = localStorage.getItem(STORAGE_KEYS.issuesCreatedCache);
    const involved = localStorage.getItem(STORAGE_KEYS.issuesInvolvedCache);
    if (created || involved) {
      return {
        created: created ? JSON.parse(created) : [],
        involved: involved ? JSON.parse(involved) : [],
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function setCachedIssues(data: {
  created: GitHubIssue[];
  involved: GitHubIssue[];
}) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.issuesCreatedCache,
      JSON.stringify(data.created),
    );
    localStorage.setItem(
      STORAGE_KEYS.issuesInvolvedCache,
      JSON.stringify(data.involved),
    );
  } catch (e) {
    console.warn("Failed to cache Issues data:", e);
  }
}

interface GitHubSearchResponse<T> {
  total_count: number;
  items: T[];
}

async function fetchIssuesByQuery(
  client: GitHubApiClient,
  query: string,
): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];
  let page = 1;
  const perPage = API_DEFAULTS.perPage;

  while (true) {
    const data = await client.rest<GitHubSearchResponse<GitHubIssue>>(
      `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`,
    );

    if (data.items.length === 0) {
      break;
    }

    allIssues.push(...data.items);

    if (data.items.length < perPage || allIssues.length >= data.total_count) {
      break;
    }

    page++;
  }

  return allIssues;
}

async function fetchAllIssues(
  token: string,
  username: string,
): Promise<{ created: GitHubIssue[]; involved: GitHubIssue[] }> {
  const client = new GitHubApiClient(token);
  const [created, involved] = await Promise.all([
    fetchIssuesByQuery(client, `author:${username} type:issue`),
    fetchIssuesByQuery(
      client,
      `involves:${username} type:issue -author:${username}`,
    ),
  ]);

  return { created, involved };
}

export function useIssues() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const cachedData = getCachedIssues();

  return useQuery({
    queryKey: [
      "issues",
      USE_GRAPHQL ? "graphql" : "rest",
      accessToken,
      user?.login,
    ],
    queryFn: async () => {
      if (!accessToken || !user?.login) throw new Error("Missing user info");

      if (!USE_GRAPHQL) {
        return fetchAllIssues(accessToken, user.login);
      }

      try {
        return await fetchAllIssuesGraphQL(accessToken, user.login);
      } catch (e) {
        console.warn("GraphQL issues fetch failed, falling back to REST:", e);
        return fetchAllIssues(accessToken, user.login);
      }
    },
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: cachedData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
