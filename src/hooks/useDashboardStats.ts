import { useMemo } from 'react';
import { StarredRepo } from '@/types/github';
import { startOfMonth, subMonths, format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// GitHub 官方语言颜色映射
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Lua: '#000080',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Clojure: '#db5855',
  Objective_C: '#438eff',
};

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

export interface TopicData {
  name: string;
  count: number;
}

export interface ActivityData {
  label: string;
  count: number;
  range: string;
}

export interface DashboardStats {
  totalStars: number;
  languageCount: number;
  topLanguage: string | null;
  newStarsThisMonth: number;
  languageDistribution: LanguageData[];
  starTrend: StarTrendData[];
  topTopics: TopicData[];
  activityData: ActivityData[];
}

export function useDashboardStats(repos: StarredRepo[] | undefined): DashboardStats {
  return useMemo(() => {
    if (!repos || repos.length === 0) {
      return {
        totalStars: 0,
        languageCount: 0,
        topLanguage: null,
        newStarsThisMonth: 0,
        languageDistribution: [],
        starTrend: [],
        topTopics: [],
        activityData: [],
      };
    }

    // 1. 语言分布统计
    const languageMap = new Map<string, number>();
    repos.forEach(repo => {
      if (repo.language) {
        languageMap.set(repo.language, (languageMap.get(repo.language) || 0) + 1);
      }
    });

    const sortedLanguages = Array.from(languageMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const totalWithLanguage = sortedLanguages.reduce((sum, [, count]) => sum + count, 0);
    
    const languageDistribution: LanguageData[] = sortedLanguages
      .slice(0, 10) // 只取前10种语言
      .map(([name, value]) => ({
        name,
        value,
        color: LANGUAGE_COLORS[name] || `hsl(${Math.random() * 360}, 70%, 50%)`,
        percentage: Math.round((value / totalWithLanguage) * 100),
      }));

    // 2. Star 趋势统计 (最近12个月)
    const now = new Date();
    const monthlyStars = new Map<string, number>();
    
    // 初始化最近12个月
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, 'yyyy-MM');
      monthlyStars.set(key, 0);
    }

    repos.forEach(repo => {
      if (repo.starred_at) {
        const starDate = new Date(repo.starred_at);
        const key = format(starDate, 'yyyy-MM');
        if (monthlyStars.has(key)) {
          monthlyStars.set(key, (monthlyStars.get(key) || 0) + 1);
        }
      }
    });

    const starTrend: StarTrendData[] = Array.from(monthlyStars.entries()).map(([key, count]) => ({
      month: format(new Date(key + '-01'), 'M月', { locale: zhCN }),
      count,
      fullDate: key,
    }));

    // 3. 热门 Topics 统计
    const topicMap = new Map<string, number>();
    repos.forEach(repo => {
      repo.topics?.forEach(topic => {
        topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
      });
    });

    const topTopics: TopicData[] = Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 4. 活跃度分析
    const activityRanges = [
      { label: '1周内', range: '< 1 week', days: 7 },
      { label: '1个月内', range: '< 1 month', days: 30 },
      { label: '3个月内', range: '< 3 months', days: 90 },
      { label: '6个月内', range: '< 6 months', days: 180 },
      { label: '1年内', range: '< 1 year', days: 365 },
      { label: '超过1年', range: '> 1 year', days: Infinity },
    ];

    const activityCounts = activityRanges.map(() => 0);
    repos.forEach(repo => {
      if (repo.pushed_at) {
        const daysSinceUpdate = differenceInDays(now, new Date(repo.pushed_at));
        for (let i = 0; i < activityRanges.length; i++) {
          if (daysSinceUpdate < activityRanges[i].days) {
            activityCounts[i]++;
            break;
          } else if (i === activityRanges.length - 1) {
            activityCounts[i]++;
          }
        }
      }
    });

    const activityData: ActivityData[] = activityRanges.map((range, i) => ({
      label: range.label,
      count: activityCounts[i],
      range: range.range,
    }));

    // 5. 本月新增统计
    const thisMonthStart = startOfMonth(now);
    const newStarsThisMonth = repos.filter(repo => {
      if (repo.starred_at) {
        return new Date(repo.starred_at) >= thisMonthStart;
      }
      return false;
    }).length;

    return {
      totalStars: repos.length,
      languageCount: languageMap.size,
      topLanguage: sortedLanguages[0]?.[0] || null,
      newStarsThisMonth,
      languageDistribution,
      starTrend,
      topTopics,
      activityData,
    };
  }, [repos]);
}
