import { GitHubPullRequest } from "@/types/github";
import { STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";
import { fetchAllPRsGraphQL } from "@/hooks/api/usePullRequestsGraphQL";
import { fetchSearchItems } from "@/hooks/api/search-pagination";
import {
  type CreatedInvolved,
  fetchCreatedInvolved,
  getCachedCreatedInvolved,
  setCachedCreatedInvolved,
} from "@/hooks/api/created-involved";
import { useCreatedInvolvedQuery } from "@/hooks/api/useCreatedInvolvedQuery";

export type PRSource = "created" | "involved";

export function getCachedPRs(): CreatedInvolved<GitHubPullRequest> | undefined {
  return getCachedCreatedInvolved<GitHubPullRequest>(
    STORAGE_KEYS.prsCreatedCache,
    STORAGE_KEYS.prsInvolvedCache,
  );
}

export function setCachedPRs(data: CreatedInvolved<GitHubPullRequest>) {
  setCachedCreatedInvolved(
    STORAGE_KEYS.prsCreatedCache,
    STORAGE_KEYS.prsInvolvedCache,
    data,
    "PRs",
  );
}

async function fetchAllPRs(
  token: string,
  username: string,
): Promise<CreatedInvolved<GitHubPullRequest>> {
  const client = new GitHubApiClient(token);

  return fetchCreatedInvolved(
    (query) => fetchSearchItems<GitHubPullRequest>(client, query),
    username,
    "pr",
  );
}

export function usePullRequests() {
  return useCreatedInvolvedQuery({
    resourceKey: "pullRequests",
    cachedData: getCachedPRs(),
    fetchRest: fetchAllPRs,
    fetchGraphQL: fetchAllPRsGraphQL,
    graphQLFallbackMessage: "GraphQL PRs fetch failed, falling back to REST:",
  });
}
