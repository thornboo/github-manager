import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubPullRequest } from "@/types/github";
import { API_DEFAULTS, STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";
import { fetchAllPRsGraphQL } from "@/hooks/api/usePullRequestsGraphQL";

// 兼容旧导出路径：逐步迁移到 lib/github-utils
export { getRepoNameFromUrl } from "@/lib/github-utils";

export type PRSource = "created" | "involved";

// 默认启用 GraphQL；如需强制回退 REST，可设置 VITE_USE_GRAPHQL=false。
const USE_GRAPHQL = import.meta.env.VITE_USE_GRAPHQL !== "false";

export function getCachedPRs():
  | { created: GitHubPullRequest[]; involved: GitHubPullRequest[] }
  | undefined {
  try {
    const created = localStorage.getItem(STORAGE_KEYS.prsCreatedCache);
    const involved = localStorage.getItem(STORAGE_KEYS.prsInvolvedCache);
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

export function setCachedPRs(data: {
  created: GitHubPullRequest[];
  involved: GitHubPullRequest[];
}) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.prsCreatedCache,
      JSON.stringify(data.created),
    );
    localStorage.setItem(
      STORAGE_KEYS.prsInvolvedCache,
      JSON.stringify(data.involved),
    );
  } catch (e) {
    console.warn("Failed to cache PRs data:", e);
  }
}

interface GitHubSearchResponse<T> {
  total_count: number;
  items: T[];
}

async function fetchPRsByQuery(
  client: GitHubApiClient,
  query: string,
): Promise<GitHubPullRequest[]> {
  const allPRs: GitHubPullRequest[] = [];
  let page = 1;
  const perPage = API_DEFAULTS.perPage;

  while (true) {
    const data = await client.rest<GitHubSearchResponse<GitHubPullRequest>>(
      `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`,
    );

    if (data.items.length === 0) {
      break;
    }

    allPRs.push(...data.items);

    if (data.items.length < perPage || allPRs.length >= data.total_count) {
      break;
    }

    page++;
  }

  return allPRs;
}

async function fetchAllPRs(
  token: string,
  username: string,
): Promise<{ created: GitHubPullRequest[]; involved: GitHubPullRequest[] }> {
  const client = new GitHubApiClient(token);
  const [created, involved] = await Promise.all([
    fetchPRsByQuery(client, `author:${username} type:pr`),
    fetchPRsByQuery(client, `involves:${username} type:pr -author:${username}`),
  ]);

  return { created, involved };
}

export function usePullRequests() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const cachedData = getCachedPRs();

  return useQuery({
    queryKey: [
      "pullRequests",
      USE_GRAPHQL ? "graphql" : "rest",
      accessToken,
      user?.login,
    ],
    queryFn: async () => {
      if (!accessToken || !user?.login) throw new Error("Missing user info");

      if (!USE_GRAPHQL) {
        return fetchAllPRs(accessToken, user.login);
      }

      try {
        return await fetchAllPRsGraphQL(accessToken, user.login);
      } catch (e) {
        console.warn("GraphQL PRs fetch failed, falling back to REST:", e);
        return fetchAllPRs(accessToken, user.login);
      }
    },
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: cachedData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
