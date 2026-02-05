import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { GitHubPullRequest } from '@/types/github';

const CACHE_KEY_CREATED = 'github_prs_created_cache';
const CACHE_KEY_INVOLVED = 'github_prs_involved_cache';

export type PRSource = 'created' | 'involved';

export function getCachedPRs(): { created: GitHubPullRequest[]; involved: GitHubPullRequest[] } | undefined {
  try {
    const created = localStorage.getItem(CACHE_KEY_CREATED);
    const involved = localStorage.getItem(CACHE_KEY_INVOLVED);
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

export function setCachedPRs(data: { created: GitHubPullRequest[]; involved: GitHubPullRequest[] }) {
  try {
    localStorage.setItem(CACHE_KEY_CREATED, JSON.stringify(data.created));
    localStorage.setItem(CACHE_KEY_INVOLVED, JSON.stringify(data.involved));
  } catch (e) {
    console.warn('Failed to cache PRs data:', e);
  }
}

async function fetchPRsByQuery(token: string, query: string): Promise<GitHubPullRequest[]> {
  const allPRs: GitHubPullRequest[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Manager',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch PRs: ${response.status}`);
    }

    const data = await response.json();
    
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

async function fetchAllPRs(token: string, username: string): Promise<{ created: GitHubPullRequest[]; involved: GitHubPullRequest[] }> {
  const [created, involved] = await Promise.all([
    fetchPRsByQuery(token, `author:${username} type:pr`),
    fetchPRsByQuery(token, `involves:${username} type:pr -author:${username}`),
  ]);

  return { created, involved };
}

export function usePullRequests() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const cachedData = getCachedPRs();

  return useQuery({
    queryKey: ['pullRequests', accessToken, user?.login],
    queryFn: () => fetchAllPRs(accessToken!, user!.login),
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: cachedData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function getRepoNameFromUrl(repositoryUrl: string): string {
  // https://api.github.com/repos/owner/repo -> owner/repo
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}
