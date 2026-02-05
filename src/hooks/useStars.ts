import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { StarredRepo } from '@/types/github';

const CACHE_KEY = 'github_stars_cache';
const CACHE_TIMESTAMP_KEY = 'github_stars_cache_timestamp';

// 从 localStorage 读取缓存
export function getCachedStars(): StarredRepo[] | undefined {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : undefined;
  } catch {
    return undefined;
  }
}

// 保存到 localStorage
export function setCachedStars(data: StarredRepo[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Failed to cache stars data:', e);
  }
}

// 获取缓存时间戳
export function getCacheTimestamp(): string | null {
  return localStorage.getItem(CACHE_TIMESTAMP_KEY);
}

async function fetchAllStars(token: string): Promise<StarredRepo[]> {
  const allStars: StarredRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.star+json', // This returns starred_at
          'User-Agent': 'GitHub-Stars-Manager',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stars: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.length === 0) {
      break;
    }

    allStars.push(...data.map((item) => ({
      id: item.repo.id,
      name: item.repo.name,
      full_name: item.repo.full_name,
      description: item.repo.description,
      html_url: item.repo.html_url,
      homepage: item.repo.homepage,
      language: item.repo.language,
      stargazers_count: item.repo.stargazers_count,
      forks_count: item.repo.forks_count,
      open_issues_count: item.repo.open_issues_count,
      topics: item.repo.topics || [],
      owner: {
        login: item.repo.owner.login,
        avatar_url: item.repo.owner.avatar_url,
        html_url: item.repo.owner.html_url,
      },
      created_at: item.repo.created_at,
      updated_at: item.repo.updated_at,
      pushed_at: item.repo.pushed_at,
      starred_at: item.starred_at,
    })));

    if (data.length < perPage) {
      break;
    }

    page++;
  }

  return allStars;
}

export function useStars() {
  const { accessToken, isAuthenticated } = useAuth();
  const cachedData = getCachedStars();

  return useQuery({
    queryKey: ['stars', accessToken],
    queryFn: () => fetchAllStars(accessToken!),
    enabled: isAuthenticated && !!accessToken,
    initialData: cachedData,
    staleTime: Infinity, // 不自动重新获取，依赖手动同步
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function getLanguages(repos: StarredRepo[]): string[] {
  const languages = new Set<string>();
  repos.forEach(repo => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });
  return Array.from(languages).sort();
}

export function filterRepos(
  repos: StarredRepo[],
  search: string,
  language: string | null
): StarredRepo[] {
  let filtered = repos;

  if (search.trim()) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(repo =>
      repo.name.toLowerCase().includes(searchLower) ||
      repo.full_name.toLowerCase().includes(searchLower) ||
      (repo.description?.toLowerCase().includes(searchLower)) ||
      repo.topics.some(topic => topic.toLowerCase().includes(searchLower))
    );
  }

  if (language) {
    filtered = filtered.filter(repo => repo.language === language);
  }

  return filtered;
}
