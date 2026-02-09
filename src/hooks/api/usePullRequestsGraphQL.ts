import { GitHubApiClient } from "@/lib/github-api";
import { SEARCH_PULL_REQUESTS_QUERY } from "@/lib/graphql/queries";
import { transformPullRequest } from "@/lib/graphql/transformers";
import {
  type CreatedInvolved,
  fetchCreatedInvolved,
} from "@/hooks/api/created-involved";
import type { GitHubPullRequest } from "@/types/github";
import type {
  GraphQLPullRequest,
  SearchPullRequestsResponse,
} from "@/types/graphql";

async function fetchPRsByQueryGraphQL(
  client: GitHubApiClient,
  query: string,
): Promise<GitHubPullRequest[]> {
  const nodes = await client.graphqlPaginated<
    SearchPullRequestsResponse,
    GraphQLPullRequest
  >(
    SEARCH_PULL_REQUESTS_QUERY,
    { query },
    (data) => data.search.pageInfo,
    (data) => (data.search.nodes || []).filter(Boolean) as GraphQLPullRequest[],
  );

  return nodes.map(transformPullRequest);
}

export async function fetchAllPRsGraphQL(
  token: string,
  username: string,
): Promise<CreatedInvolved<GitHubPullRequest>> {
  const client = new GitHubApiClient(token);

  return fetchCreatedInvolved(
    (query) => fetchPRsByQueryGraphQL(client, query),
    username,
    "pr",
  );
}
