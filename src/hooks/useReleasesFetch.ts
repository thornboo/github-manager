import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { GitHubRelease, ReleaseWithRepo, ReleaseSubscription } from '@/types/github';

async function fetchRepoReleases(
  token: string,
  repoFullName: string,
  perPage: number = 10
): Promise<GitHubRelease[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/releases?per_page=${perPage}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Stars-Manager',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      // Repo doesn't exist or has no releases
      return [];
    }
    throw new Error(`Failed to fetch releases for ${repoFullName}: ${response.status}`);
  }

  return response.json();
}

async function fetchAllSubscribedReleases(
  token: string,
  subscriptions: ReleaseSubscription[]
): Promise<ReleaseWithRepo[]> {
  if (subscriptions.length === 0) {
    return [];
  }

  // Fetch releases for all subscribed repos in parallel
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const releases = await fetchRepoReleases(token, sub.repoFullName, 5);
      return releases
        .filter(r => !r.draft) // Exclude drafts
        .map(release => ({
          ...release,
          repoFullName: sub.repoFullName,
        }));
    })
  );

  // Collect all successful releases
  const allReleases: ReleaseWithRepo[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      allReleases.push(...result.value);
    }
  });

  // Sort by published date, newest first
  allReleases.sort((a, b) => 
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return allReleases;
}

export function useReleasesFetch(subscriptions: ReleaseSubscription[]) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['releases', subscriptions.map(s => s.repoFullName).join(',')],
    queryFn: () => fetchAllSubscribedReleases(accessToken!, subscriptions),
    enabled: isAuthenticated && !!accessToken && subscriptions.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to verify a repo exists and has releases
export function useVerifyRepo(repoFullName: string | null) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['verify-repo', repoFullName],
    queryFn: async () => {
      if (!repoFullName) return null;
      
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Stars-Manager',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('仓库不存在');
        }
        throw new Error(`验证失败: ${response.status}`);
      }

      return response.json();
    },
    enabled: isAuthenticated && !!accessToken && !!repoFullName,
    retry: false,
  });
}
