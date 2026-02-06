import { GitHubApiClient } from "@/lib/github-api";
import { SEARCH_ISSUES_QUERY } from "@/lib/graphql/queries";
import { transformIssue } from "@/lib/graphql/transformers";
import type { GitHubIssue } from "@/types/github";
import type { GraphQLIssue, SearchIssuesResponse } from "@/types/graphql";

async function fetchIssuesByQueryGraphQL(
  client: GitHubApiClient,
  query: string,
): Promise<GitHubIssue[]> {
  const nodes = await client.graphqlPaginated<
    SearchIssuesResponse,
    GraphQLIssue
  >(
    SEARCH_ISSUES_QUERY,
    { query },
    (data) => data.search.pageInfo,
    (data) => (data.search.nodes || []).filter(Boolean) as GraphQLIssue[],
  );

  return nodes.map(transformIssue);
}

export async function fetchAllIssuesGraphQL(
  token: string,
  username: string,
): Promise<{ created: GitHubIssue[]; involved: GitHubIssue[] }> {
  const client = new GitHubApiClient(token);
  const [created, involved] = await Promise.all([
    fetchIssuesByQueryGraphQL(client, `author:${username} type:issue`),
    fetchIssuesByQueryGraphQL(
      client,
      `involves:${username} type:issue -author:${username}`,
    ),
  ]);

  return { created, involved };
}
