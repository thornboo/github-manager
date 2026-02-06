import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StarredRepo } from "@/types/github";
import { API_DEFAULTS, STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";

// 从 localStorage 读取缓存
export function getCachedStars(): StarredRepo[] | undefined {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.starsCache);
    return cached ? JSON.parse(cached) : undefined;
  } catch {
    return undefined;
  }
}

// 保存到 localStorage
export function setCachedStars(data: StarredRepo[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.starsCache, JSON.stringify(data));
    localStorage.setItem(
      STORAGE_KEYS.starsCacheTimestamp,
      new Date().toISOString(),
    );
  } catch (e) {
    console.warn("Failed to cache stars data:", e);
  }
}

// 获取缓存时间戳
export function getCacheTimestamp(): string | null {
  return localStorage.getItem(STORAGE_KEYS.starsCacheTimestamp);
}

interface GitHubStarredItem {
  starred_at: string;
  repo: {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    topics?: string[];
    owner: {
      login: string;
      avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    pushed_at: string;
  };
}

async function fetchAllStars(token: string): Promise<StarredRepo[]> {
  const client = new GitHubApiClient(token);
  const allStars: StarredRepo[] = [];
  let page = 1;
  const perPage = API_DEFAULTS.perPage;

  while (true) {
    const data = await client.rest<GitHubStarredItem[]>(
      `/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      { headers: { Accept: "application/vnd.github.star+json" } }, // This returns starred_at
    );

    if (data.length === 0) {
      break;
    }

    allStars.push(
      ...data.map((item) => ({
        id: item.repo.id,
        name: item.repo.name,
        full_name: item.repo.full_name,
        description: item.repo.description,
        html_url: item.repo.html_url,
        homepage: item.repo.homepage,
        language: item.repo.language,
        stargazers_count: item.repo.stargazers_count,
        forks_count: item.repo.forks_count,
        topics: item.repo.topics || [],
        owner: {
          login: item.repo.owner.login,
          avatar_url: item.repo.owner.avatar_url,
        },
        created_at: item.repo.created_at,
        updated_at: item.repo.updated_at,
        pushed_at: item.repo.pushed_at,
        starred_at: item.starred_at,
      })),
    );

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
    queryKey: ["stars", accessToken],
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
  repos.forEach((repo) => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });
  return Array.from(languages).sort();
}

export function filterRepos(
  repos: StarredRepo[],
  search: string,
  language: string | null,
): StarredRepo[] {
  let filtered = repos;

  if (search.trim()) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (repo) =>
        repo.name.toLowerCase().includes(searchLower) ||
        repo.full_name.toLowerCase().includes(searchLower) ||
        repo.description?.toLowerCase().includes(searchLower) ||
        repo.topics.some((topic) => topic.toLowerCase().includes(searchLower)),
    );
  }

  if (language) {
    filtered = filtered.filter((repo) => repo.language === language);
  }

  return filtered;
}
