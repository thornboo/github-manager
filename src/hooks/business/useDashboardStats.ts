import { useMemo } from "react";
import {
  GitHubIssue,
  GitHubPullRequest,
  ReleaseSubscription,
  StarredRepo,
} from "@/types/github";
import { startOfMonth, subMonths, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getLanguageColor } from "@/lib/language-colors";

export interface LanguageData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface StarTrendData {
  month: string;
  count: number;
  fullDate: string;
}

export interface DashboardStats {
  // Stars
  totalStars: number;
  languageDistribution: LanguageData[];
  starTrend: StarTrendData[];
  newStarsThisMonth: number;
  recentStars: StarredRepo[];

  // Pull Requests
  openPRCount: {
    total: number;
    created: number;
    involved: number;
  };
  openPRs: GitHubPullRequest[];

  // Issues
  openIssueCount: {
    total: number;
    created: number;
    involved: number;
  };
  openIssues: GitHubIssue[];

  // Releases
  pendingReleaseCount: number;
}

function mergeAndSortOpenPRs(pullRequests: {
  created: GitHubPullRequest[];
  involved: GitHubPullRequest[];
}): GitHubPullRequest[] {
  return [...pullRequests.created, ...pullRequests.involved]
    .filter((pr) => pr.state === "open")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}

function mergeAndSortOpenIssues(issues: {
  created: GitHubIssue[];
  involved: GitHubIssue[];
}): GitHubIssue[] {
  return [...issues.created, ...issues.involved]
    .filter((issue) => issue.state === "open")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}

function computePendingReleaseCount(
  subscriptions: ReleaseSubscription[],
): number {
  return subscriptions.filter((sub) => {
    if (!sub.latestRelease) return false;
    if (!sub.lastCheckedAt) return true;
    return (
      new Date(sub.latestRelease.publishedAt).getTime() >
      new Date(sub.lastCheckedAt).getTime()
    );
  }).length;
}

export function useDashboardStats(
  stars: StarredRepo[] | undefined,
  pullRequests:
    | { created: GitHubPullRequest[]; involved: GitHubPullRequest[] }
    | undefined,
  issues: { created: GitHubIssue[]; involved: GitHubIssue[] } | undefined,
  releaseSubscriptions: ReleaseSubscription[] | undefined,
): DashboardStats {
  return useMemo(() => {
    const safeStars = stars || [];
    const safePRs = pullRequests || { created: [], involved: [] };
    const safeIssues = issues || { created: [], involved: [] };
    const safeSubscriptions = releaseSubscriptions || [];

    if (safeStars.length === 0) {
      return {
        totalStars: 0,
        languageDistribution: [],
        starTrend: [],
        newStarsThisMonth: 0,
        recentStars: [],
        openPRCount: { total: 0, created: 0, involved: 0 },
        openPRs: [],
        openIssueCount: { total: 0, created: 0, involved: 0 },
        openIssues: [],
        pendingReleaseCount: 0,
      };
    }

    // 1. 语言分布统计
    const languageMap = new Map<string, number>();
    safeStars.forEach((repo) => {
      if (repo.language) {
        languageMap.set(
          repo.language,
          (languageMap.get(repo.language) || 0) + 1,
        );
      }
    });

    const sortedLanguages = Array.from(languageMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const totalWithLanguage = sortedLanguages.reduce(
      (sum, [, count]) => sum + count,
      0,
    );

    const topLanguageEntries = sortedLanguages.slice(0, 6); // 只取前 6 种语言（更利于图表可读性）
    const otherLanguageCount = sortedLanguages
      .slice(6)
      .reduce((sum, [, count]) => sum + count, 0);

    const languageDistribution: LanguageData[] = topLanguageEntries.map(
      ([name, value]) => ({
        name,
        value,
        color: getLanguageColor(name),
        percentage:
          totalWithLanguage === 0
            ? 0
            : Math.round((value / totalWithLanguage) * 100),
      }),
    );

    if (otherLanguageCount > 0) {
      languageDistribution.push({
        name: "其他",
        value: otherLanguageCount,
        color: "hsl(220, 10%, 65%)",
        percentage:
          totalWithLanguage === 0
            ? 0
            : Math.round((otherLanguageCount / totalWithLanguage) * 100),
      });
    }

    // 2. Star 趋势统计 (最近 6 个月)
    const now = new Date();
    const monthlyStars = new Map<string, number>();

    // 初始化最近 6 个月
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, "yyyy-MM");
      monthlyStars.set(key, 0);
    }

    safeStars.forEach((repo) => {
      if (repo.starred_at) {
        const starDate = new Date(repo.starred_at);
        const key = format(starDate, "yyyy-MM");
        if (monthlyStars.has(key)) {
          monthlyStars.set(key, (monthlyStars.get(key) || 0) + 1);
        }
      }
    });

    const starTrend: StarTrendData[] = Array.from(monthlyStars.entries()).map(
      ([key, count]) => ({
        month: format(new Date(key + "-01"), "M月", { locale: zhCN }),
        count,
        fullDate: key,
      }),
    );

    // 3. 本月新增统计
    const thisMonthStart = startOfMonth(now);
    const newStarsThisMonth = safeStars.filter((repo) => {
      if (repo.starred_at) {
        return new Date(repo.starred_at) >= thisMonthStart;
      }
      return false;
    }).length;

    // 4. 最近 Star（最近 5 个）
    const recentStars = [...safeStars]
      .sort(
        (a, b) =>
          new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime(),
      )
      .slice(0, 5);

    // 5. Open PR / Issue（统计 + 列表）
    const openPRCreated = safePRs.created.filter(
      (pr) => pr.state === "open",
    ).length;
    const openPRInvolved = safePRs.involved.filter(
      (pr) => pr.state === "open",
    ).length;
    const openPRs = mergeAndSortOpenPRs(safePRs).slice(0, 5);

    const openIssueCreated = safeIssues.created.filter(
      (issue) => issue.state === "open",
    ).length;
    const openIssueInvolved = safeIssues.involved.filter(
      (issue) => issue.state === "open",
    ).length;
    const openIssues = mergeAndSortOpenIssues(safeIssues).slice(0, 5);

    return {
      languageDistribution,
      starTrend,
      newStarsThisMonth,
      totalStars: safeStars.length,
      recentStars,
      openPRCount: {
        total: openPRCreated + openPRInvolved,
        created: openPRCreated,
        involved: openPRInvolved,
      },
      openPRs,
      openIssueCount: {
        total: openIssueCreated + openIssueInvolved,
        created: openIssueCreated,
        involved: openIssueInvolved,
      },
      openIssues,
      pendingReleaseCount: computePendingReleaseCount(safeSubscriptions),
    };
  }, [stars, pullRequests, issues, releaseSubscriptions]);
}
