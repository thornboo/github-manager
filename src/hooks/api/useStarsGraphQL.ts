import { GitHubApiClient } from "@/lib/github-api";
import { STARRED_REPOS_QUERY } from "@/lib/graphql/queries";
import { transformStarredRepo } from "@/lib/graphql/transformers";
import type { StarredRepo } from "@/types/github";
import type { GraphQLStarredEdge, StarredReposResponse } from "@/types/graphql";

export async function fetchAllStarsGraphQL(
  token: string,
): Promise<StarredRepo[]> {
  const client = new GitHubApiClient(token);

  const edges = await client.graphqlPaginated<
    StarredReposResponse,
    GraphQLStarredEdge
  >(
    STARRED_REPOS_QUERY,
    {},
    (data) => data.viewer.starredRepositories.pageInfo,
    (data) =>
      (data.viewer.starredRepositories.edges || []).filter(
        Boolean,
      ) as GraphQLStarredEdge[],
  );

  return edges.map(transformStarredRepo);
}
