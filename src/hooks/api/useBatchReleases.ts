import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithGraphQLFallback, isGraphQLEnabled } from "@/lib/graphql-mode";
import { GitHubApiClient, GitHubApiError } from "@/lib/github-api";
import type { ReleaseSubscription } from "@/types/local";
import type { GitHubRelease } from "@/types/github";

function buildBatchReleasesQuery(repos: string[]): string {
  const repoQueries = repos
    .map((repo, index) => {
      const [owner = "", name = ""] = repo.split("/");
      const ownerLiteral = JSON.stringify(owner);
      const nameLiteral = JSON.stringify(name);

      return `
        repo${index}: repository(owner: ${ownerLiteral}, name: ${nameLiteral}) {
          nameWithOwner
          releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              tagName
              name
              publishedAt
              url
              isPrerelease
              isDraft
            }
          }
        }
      `;
    })
    .join("\n");

  return `query BatchReleases {\n${repoQueries}\n}`;
}

type LatestRelease = ReleaseSubscription["latestRelease"];

interface BatchReleasesRepo {
  nameWithOwner: string;
  releases?: {
    nodes?: Array<{
      tagName: string;
      name: string | null;
      publishedAt: string;
      url: string;
      isPrerelease: boolean;
      isDraft: boolean;
    } | null>;
  } | null;
}

type BatchReleasesResult = Record<string, BatchReleasesRepo | null>;

async function fetchBatchReleases(
  token: string,
  subscriptions: ReleaseSubscription[],
): Promise<Map<string, LatestRelease>> {
  return fetchWithGraphQLFallback({
    fetchRest: () => fetchBatchReleasesRest(token, subscriptions),
    fetchGraphQL: () => fetchBatchReleasesGraphQL(token, subscriptions),
    fallbackMessage:
      "GraphQL batch releases fetch failed, falling back to REST:",
    useGraphQL: isGraphQLEnabled,
  });
}

async function fetchBatchReleasesGraphQL(
  token: string,
  subscriptions: ReleaseSubscription[],
): Promise<Map<string, LatestRelease>> {
  if (subscriptions.length === 0) return new Map();

  const client = new GitHubApiClient(token);
  const repos = subscriptions.map((s) => s.repoFullName);

  // GitHub GraphQL 有查询复杂度限制，按批次请求更稳妥。
  const BATCH_SIZE = 20;
  const results = new Map<string, LatestRelease>();

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const query = buildBatchReleasesQuery(batch);

    const data = await client.graphql<BatchReleasesResult>(query);
    for (const repo of Object.values(data)) {
      if (!repo?.releases?.nodes?.length) continue;
      const latest = repo.releases.nodes.find((r) => r && !r.isDraft) || null;
      if (!latest) continue;

      results.set(repo.nameWithOwner, {
        tagName: latest.tagName,
        name: latest.name,
        publishedAt: latest.publishedAt,
        htmlUrl: latest.url,
      });
    }
  }

  return results;
}

async function fetchLatestReleaseRest(
  client: GitHubApiClient,
  repoFullName: string,
): Promise<LatestRelease | null> {
  try {
    const releases = await client.rest<GitHubRelease[]>(
      `/repos/${repoFullName}/releases?per_page=1`,
    );
    const latest = releases.find((r) => !r.draft) || null;
    if (!latest) return null;

    return {
      tagName: latest.tag_name,
      name: latest.name,
      publishedAt: latest.published_at,
      htmlUrl: latest.html_url,
    };
  } catch (e) {
    if (e instanceof GitHubApiError && e.status === 404) return null;
    throw e;
  }
}

async function fetchBatchReleasesRest(
  token: string,
  subscriptions: ReleaseSubscription[],
): Promise<Map<string, LatestRelease>> {
  if (subscriptions.length === 0) return new Map();

  const client = new GitHubApiClient(token);
  const results = new Map<string, LatestRelease>();

  const settled = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const latest = await fetchLatestReleaseRest(client, sub.repoFullName);
      return latest ? { repoFullName: sub.repoFullName, latest } : null;
    }),
  );

  settled.forEach((r) => {
    if (r.status !== "fulfilled" || !r.value) return;
    results.set(r.value.repoFullName, r.value.latest);
  });

  return results;
}

export function useBatchReleases(subscriptions: ReleaseSubscription[]) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["batch-releases", subscriptions.map((s) => s.repoFullName)],
    queryFn: () => fetchBatchReleases(accessToken!, subscriptions),
    enabled: isAuthenticated && !!accessToken && subscriptions.length > 0,
    staleTime: 10 * 60 * 1000, // 10 分钟
    refetchOnWindowFocus: false,
  });
}
