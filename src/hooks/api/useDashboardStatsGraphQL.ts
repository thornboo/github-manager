import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubApiClient } from "@/lib/github-api";
import { DASHBOARD_STATS_QUERY } from "@/lib/graphql/queries";
import type { DashboardStatsResponse } from "@/types/graphql";

export interface DashboardStatsGraphQL {
  username: string;
  totalStars: number;
  openPRs: number;
  openIssues: number;
  totalRepos: number;
}

async function fetchDashboardStatsGraphQL(
  token: string,
): Promise<DashboardStatsGraphQL> {
  const client = new GitHubApiClient(token);
  const data = await client.graphql<DashboardStatsResponse>(
    DASHBOARD_STATS_QUERY,
  );

  return {
    username: data.viewer.login,
    totalStars: data.viewer.starredRepositories.totalCount,
    openPRs: data.viewer.pullRequests.totalCount,
    openIssues: data.viewer.issues.totalCount,
    totalRepos: data.viewer.repositories.totalCount,
  };
}

export function useDashboardStatsGraphQL() {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats-graphql", accessToken],
    queryFn: () => fetchDashboardStatsGraphQL(accessToken!),
    enabled: isAuthenticated && !!accessToken,
    staleTime: 60 * 1000, // 1 分钟
    refetchOnWindowFocus: false,
  });
}
