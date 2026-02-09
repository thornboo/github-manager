import { useMemo } from "react";
import { GitHubIssue, GitHubPullRequest, StarredRepo } from "@/types/github";
import { ReleaseSubscription } from "@/types/local";
import { startOfMonth, subMonths, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getLanguageColor } from "@/lib/language-colors";
import type { CreatedInvolved } from "@/hooks/api/created-involved";

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

interface OpenStateSummary {
  total: number;
  created: number;
  involved: number;
}

interface OpenStateItem {
  state: string;
  updated_at: string;
}

export interface DashboardStats {
  totalStars: number;
  languageDistribution: LanguageData[];
  starTrend: StarTrendData[];
  newStarsThisMonth: number;
  recentStars: StarredRepo[];
  openPRCount: OpenStateSummary;
  openPRs: GitHubPullRequest[];
  openIssueCount: OpenStateSummary;
  openIssues: GitHubIssue[];
  pendingReleaseCount: number;
}

function countOpenItems<T extends { state: string }>(items: T[]): number {
  return items.filter((item) => item.state === "open").length;
}

function mergeAndSortOpenItems<T extends OpenStateItem>(
  items: CreatedInvolved<T>,
): T[] {
  return [...items.created, ...items.involved]
    .filter((item) => item.state === "open")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}

function summarizeOpenItems<T extends OpenStateItem>(
  items: CreatedInvolved<T>,
) {
  const created = countOpenItems(items.created);
  const involved = countOpenItems(items.involved);

  return {
    count: {
      total: created + involved,
      created,
      involved,
    },
    items: mergeAndSortOpenItems(items).slice(0, 5),
  };
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

function getSafeCreatedInvolved<T>(
  items: CreatedInvolved<T> | undefined,
): CreatedInvolved<T> {
  return items || { created: [], involved: [] };
}

export function useDashboardStats(
  stars: StarredRepo[] | undefined,
  pullRequests: CreatedInvolved<GitHubPullRequest> | undefined,
  issues: CreatedInvolved<GitHubIssue> | undefined,
  releaseSubscriptions: ReleaseSubscription[] | undefined,
): DashboardStats {
  return useMemo(() => {
    const safeStars = stars || [];
    const safePRs = getSafeCreatedInvolved(pullRequests);
    const safeIssues = getSafeCreatedInvolved(issues);
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

    const topLanguageEntries = sortedLanguages.slice(0, 6);
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

    const now = new Date();
    const monthlyStars = new Map<string, number>();

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

    const thisMonthStart = startOfMonth(now);
    const newStarsThisMonth = safeStars.filter((repo) => {
      if (repo.starred_at) {
        return new Date(repo.starred_at) >= thisMonthStart;
      }
      return false;
    }).length;

    const recentStars = [...safeStars]
      .sort(
        (a, b) =>
          new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime(),
      )
      .slice(0, 5);

    const openPRSummary = summarizeOpenItems(safePRs);
    const openIssueSummary = summarizeOpenItems(safeIssues);

    return {
      languageDistribution,
      starTrend,
      newStarsThisMonth,
      totalStars: safeStars.length,
      recentStars,
      openPRCount: openPRSummary.count,
      openPRs: openPRSummary.items,
      openIssueCount: openIssueSummary.count,
      openIssues: openIssueSummary.items,
      pendingReleaseCount: computePendingReleaseCount(safeSubscriptions),
    };
  }, [stars, pullRequests, issues, releaseSubscriptions]);
}
