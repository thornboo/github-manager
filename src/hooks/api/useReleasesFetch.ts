import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubRelease, GitHubRepo } from "@/types/github";
import { ReleaseWithRepo, ReleaseSubscription } from "@/types/local";
import { fetchWithGraphQLFallback, isGraphQLEnabled } from "@/lib/graphql-mode";
import { GitHubApiClient, GitHubApiError } from "@/lib/github-api";
import { parseRepoFullName } from "@/lib/github-utils";

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

interface GraphQLReleaseNode {
  databaseId: number | null;
  tagName: string;
  name: string | null;
  description: string | null;
  publishedAt: string | null;
  createdAt: string;
  url: string;
  isPrerelease: boolean;
  isDraft: boolean;
  author: { login: string; avatarUrl: string } | null;
}

interface GraphQLRepoReleasesResult {
  nameWithOwner: string;
  releases?: { nodes?: Array<GraphQLReleaseNode | null> | null } | null;
}

type BatchRepoReleasesResult = Record<string, GraphQLRepoReleasesResult | null>;

interface GraphQLVerifyRepo {
  databaseId: number | null;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  primaryLanguage: { name: string } | null;
  stargazerCount: number;
  forkCount: number;
  repositoryTopics: { nodes: Array<{ topic: { name: string } } | null> };
  owner: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

function hashToInt(input: string): number {
  // Stable 32-bit hash (djb2 variant) for cases where databaseId is unavailable.
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function buildBatchRepoReleasesQuery(repos: string[], perRepo: number): string {
  const repoQueries = repos
    .map((repoFullName, index) => {
      const { owner, repo } = parseRepoFullName(repoFullName);
      if (!owner || !repo) return null;

      const ownerLiteral = JSON.stringify(owner);
      const repoLiteral = JSON.stringify(repo);
      const perRepoLiteral = Number.isFinite(perRepo)
        ? Math.max(1, perRepo)
        : 1;

      return `
        repo${index}: repository(owner: ${ownerLiteral}, name: ${repoLiteral}) {
          nameWithOwner
          releases(first: ${perRepoLiteral}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              databaseId
              tagName
              name
              description
              publishedAt
              createdAt
              url
              isPrerelease
              isDraft
              author {
                login
                avatarUrl
              }
            }
          }
        }
      `;
    })
    .filter(Boolean)
    .join("\n");

  return `query BatchRepoReleases {\n${repoQueries}\n}`;
}

async function fetchAllSubscribedReleasesGraphQL(
  client: GitHubApiClient,
  subscriptions: ReleaseSubscription[],
  perRepo: number,
): Promise<ReleaseWithRepo[]> {
  if (subscriptions.length === 0) return [];

  const repos = subscriptions.map((s) => s.repoFullName);

  // GitHub GraphQL 有查询复杂度限制：按批次请求更稳妥。
  const BATCH_SIZE = 10;
  const allReleases: ReleaseWithRepo[] = [];

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const query = buildBatchRepoReleasesQuery(batch, perRepo);
    if (!query.trim()) continue;

    const data = await client.graphql<BatchRepoReleasesResult>(query);

    for (const repo of Object.values(data)) {
      if (!repo?.releases?.nodes?.length) continue;
      const repoFullName = repo.nameWithOwner;

      for (const release of repo.releases.nodes) {
        if (!release) continue;
        if (release.isDraft) continue;

        const publishedAt = release.publishedAt || release.createdAt;

        allReleases.push({
          id:
            release.databaseId ??
            hashToInt(`${repoFullName}:${release.tagName}:${publishedAt}`),
          tag_name: release.tagName,
          name: release.name,
          body: release.description,
          html_url: release.url,
          published_at: publishedAt,
          prerelease: release.isPrerelease,
          draft: release.isDraft,
          author: {
            login: release.author?.login ?? "unknown",
            avatar_url: release.author?.avatarUrl ?? "",
          },
          repoFullName,
        });
      }
    }
  }

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
    queryFn: async () => {
      if (!accessToken) throw new Error("Missing access token");
      const client = new GitHubApiClient(accessToken);

      return fetchWithGraphQLFallback({
        fetchRest: () =>
          fetchAllSubscribedReleases(client, subscriptions, perRepo),
        fetchGraphQL: () =>
          fetchAllSubscribedReleasesGraphQL(client, subscriptions, perRepo),
        fallbackMessage: "GraphQL releases fetch failed, falling back to REST:",
        useGraphQL: isGraphQLEnabled,
      });
    },
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
        if (!isGraphQLEnabled) {
          return await client.rest<GitHubRepo>(`/repos/${repoFullName}`);
        }

        const { owner, repo } = parseRepoFullName(repoFullName);
        if (!owner || !repo) throw new Error("仓库格式错误，应为 owner/repo");

        const query = `
          query VerifyRepo($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              databaseId
              name
              nameWithOwner
              description
              url
              homepageUrl
              primaryLanguage {
                name
              }
              stargazerCount
              forkCount
              repositoryTopics(first: 20) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              owner {
                login
                avatarUrl
              }
              createdAt
              updatedAt
              pushedAt
            }
          }
        `;

        const data = await client.graphql<{
          repository: GraphQLVerifyRepo | null;
        }>(query, { owner, name: repo });

        const r = data.repository;
        if (!r || !r.databaseId) {
          throw new GitHubApiError("仓库不存在", 404, {
            url: "graphql",
            method: "POST",
          });
        }

        return {
          id: r.databaseId,
          name: r.name,
          full_name: r.nameWithOwner,
          owner: {
            login: r.owner.login,
            avatar_url: r.owner.avatarUrl,
          },
          html_url: r.url,
          description: r.description,
          stargazers_count: r.stargazerCount,
          forks_count: r.forkCount,
          language: r.primaryLanguage?.name ?? null,
          topics: (r.repositoryTopics.nodes || [])
            .filter(Boolean)
            .map((t) => t!.topic.name),
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          pushed_at: r.pushedAt,
          homepage: r.homepageUrl,
        };
      } catch (e) {
        let finalError: unknown = e;

        if (isGraphQLEnabled) {
          console.warn("GraphQL repo verify failed, falling back to REST:", e);
          try {
            return await client.rest<GitHubRepo>(`/repos/${repoFullName}`);
          } catch (restErr) {
            finalError = restErr;
          }
        }

        if (finalError instanceof GitHubApiError && finalError.status === 404) {
          throw new Error("仓库不存在");
        }
        if (finalError instanceof GitHubApiError) {
          throw new Error(`验证失败: ${finalError.status}`);
        }
        throw finalError;
      }
    },
    enabled: isAuthenticated && !!accessToken && !!repoFullName,
    retry: false,
  });
}
