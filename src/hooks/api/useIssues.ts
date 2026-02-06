import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubIssue } from "@/types/github";
import { API_DEFAULTS, STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";

// 兼容旧导出路径：逐步迁移到 lib/github-utils
export { getRepoNameFromUrl } from "@/lib/github-utils";

export type IssueSource = "created" | "involved";

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
    queryKey: ["issues", accessToken, user?.login],
    queryFn: () => fetchAllIssues(accessToken!, user!.login),
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: cachedData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
