import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  GitHubRelease,
  GitHubRepo,
  ReleaseWithRepo,
  ReleaseSubscription,
} from "@/types/github";
import { GitHubApiClient, GitHubApiError } from "@/lib/github-api";

async function fetchRepoReleases(
  client: GitHubApiClient,
  repoFullName: string,
  perPage: number = 10,
): Promise<GitHubRelease[]> {
  try {
    return await client.rest<GitHubRelease[]>(
      `/repos/${repoFullName}/releases?per_page=${perPage}`,
    );
  } catch (e) {
    if (e instanceof GitHubApiError && e.status === 404) {
      // Repo doesn't exist or has no releases
      return [];
    }
    throw e;
  }
}

async function fetchAllSubscribedReleases(
  client: GitHubApiClient,
  subscriptions: ReleaseSubscription[],
  perRepo: number,
): Promise<ReleaseWithRepo[]> {
  if (subscriptions.length === 0) {
    return [];
  }

  // Fetch releases for all subscribed repos in parallel
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const releases = await fetchRepoReleases(
        client,
        sub.repoFullName,
        perRepo,
      );
      return releases
        .filter((r) => !r.draft) // Exclude drafts
        .map((release) => ({
          ...release,
          repoFullName: sub.repoFullName,
        }));
    }),
  );

  // Collect all successful releases
  const allReleases: ReleaseWithRepo[] = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      allReleases.push(...result.value);
    }
  });

  // Sort by published date, newest first
  allReleases.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );

  return allReleases;
}

export function useReleasesFetch(
  subscriptions: ReleaseSubscription[],
  options?: { perRepo?: number },
) {
  const { accessToken, isAuthenticated } = useAuth();
  const perRepo = options?.perRepo ?? 5;

  return useQuery({
    queryKey: [
      "releases",
      perRepo,
      subscriptions.map((s) => s.repoFullName).join(","),
    ],
    queryFn: () =>
      fetchAllSubscribedReleases(
        new GitHubApiClient(accessToken!),
        subscriptions,
        perRepo,
      ),
    enabled: isAuthenticated && !!accessToken && subscriptions.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to verify a repo exists and has releases
export function useVerifyRepo(repoFullName: string | null) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["verify-repo", repoFullName],
    queryFn: async () => {
      if (!repoFullName) return null;
      const client = new GitHubApiClient(accessToken!);

      try {
        return await client.rest<GitHubRepo>(`/repos/${repoFullName}`);
      } catch (e) {
        if (e instanceof GitHubApiError && e.status === 404) {
          throw new Error("仓库不存在");
        }
        if (e instanceof GitHubApiError) {
          throw new Error(`验证失败: ${e.status}`);
        }
        throw e;
      }
    },
    enabled: isAuthenticated && !!accessToken && !!repoFullName,
    retry: false,
  });
}
