import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { GitHubIssue } from '@/types/github';

const CACHE_KEY_CREATED = 'github_issues_created_cache';
const CACHE_KEY_INVOLVED = 'github_issues_involved_cache';

export type IssueSource = 'created' | 'involved';

export function getCachedIssues(): { created: GitHubIssue[]; involved: GitHubIssue[] } | undefined {
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

export function setCachedIssues(data: { created: GitHubIssue[]; involved: GitHubIssue[] }) {
  try {
    localStorage.setItem(CACHE_KEY_CREATED, JSON.stringify(data.created));
    localStorage.setItem(CACHE_KEY_INVOLVED, JSON.stringify(data.involved));
  } catch (e) {
    console.warn('Failed to cache Issues data:', e);
  }
}

async function fetchIssuesByQuery(token: string, query: string): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];
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
      throw new Error(`Failed to fetch Issues: ${response.status}`);
    }

    const data = await response.json();
    
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

async function fetchAllIssues(token: string, username: string): Promise<{ created: GitHubIssue[]; involved: GitHubIssue[] }> {
  const [created, involved] = await Promise.all([
    fetchIssuesByQuery(token, `author:${username} type:issue`),
    fetchIssuesByQuery(token, `involves:${username} type:issue -author:${username}`),
  ]);

  return { created, involved };
}

export function useIssues() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const cachedData = getCachedIssues();

  return useQuery({
    queryKey: ['issues', accessToken, user?.login],
    queryFn: () => fetchAllIssues(accessToken!, user!.login),
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: cachedData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function getRepoNameFromUrl(repositoryUrl: string): string {
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}
