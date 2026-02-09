import { GitHubIssue } from "@/types/github";
import { STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient } from "@/lib/github-api";
import { fetchAllIssuesGraphQL } from "@/hooks/api/useIssuesGraphQL";
import { fetchSearchItems } from "@/hooks/api/search-pagination";
import {
  type CreatedInvolved,
  fetchCreatedInvolved,
  getCachedCreatedInvolved,
  setCachedCreatedInvolved,
} from "@/hooks/api/created-involved";
import { useCreatedInvolvedQuery } from "@/hooks/api/useCreatedInvolvedQuery";

export type IssueSource = "created" | "involved";

export function getCachedIssues(): CreatedInvolved<GitHubIssue> | undefined {
  return getCachedCreatedInvolved<GitHubIssue>(
    STORAGE_KEYS.issuesCreatedCache,
    STORAGE_KEYS.issuesInvolvedCache,
  );
}

export function setCachedIssues(data: CreatedInvolved<GitHubIssue>) {
  setCachedCreatedInvolved(
    STORAGE_KEYS.issuesCreatedCache,
    STORAGE_KEYS.issuesInvolvedCache,
    data,
    "Issues",
  );
}

async function fetchAllIssues(
  token: string,
  username: string,
): Promise<CreatedInvolved<GitHubIssue>> {
  const client = new GitHubApiClient(token);

  return fetchCreatedInvolved(
    (query) => fetchSearchItems<GitHubIssue>(client, query),
    username,
    "issue",
  );
}

export function useIssues() {
  return useCreatedInvolvedQuery({
    resourceKey: "issues",
    cachedData: getCachedIssues(),
    fetchRest: fetchAllIssues,
    fetchGraphQL: fetchAllIssuesGraphQL,
    graphQLFallbackMessage:
      "GraphQL issues fetch failed, falling back to REST:",
  });
}
