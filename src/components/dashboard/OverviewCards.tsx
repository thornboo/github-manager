import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Star, GitPullRequest, CircleDot, Rss, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardStats } from "@/hooks/useDashboardStats";

interface OverviewCardsProps {
  stats: DashboardStats;
  isLoading?: boolean;
  subscriptionCount: number;
}

type OverviewCard = {
  label: string;
  value: string;
  icon: typeof Star;
  iconClassName: string;
  to: string;
  tooltip?: ReactNode;
};

export function OverviewCards({
  stats,
  isLoading,
  subscriptionCount,
}: OverviewCardsProps) {
  const cards: OverviewCard[] = [
    {
      label: "总 Stars",
      value: stats.totalStars.toString(),
      icon: Star,
      iconClassName: "text-yellow-500",
      to: "/repos",
    },
    {
      label: "Open PR",
      value: stats.openPRCount.total.toString(),
      icon: GitPullRequest,
      iconClassName: "text-green-500",
      to: "/pulls?state=open&source=all",
      tooltip: (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">我创建的</span>
            <span className="font-medium">{stats.openPRCount.created}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">我参与的</span>
            <span className="font-medium">{stats.openPRCount.involved}</span>
          </div>
        </div>
      ),
    },
    {
      label: "Open Issue",
      value: stats.openIssueCount.total.toString(),
      icon: CircleDot,
      iconClassName: "text-blue-500",
      to: "/issues?state=open&source=all",
      tooltip: (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">我创建的</span>
            <span className="font-medium">{stats.openIssueCount.created}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">我参与的</span>
            <span className="font-medium">{stats.openIssueCount.involved}</span>
          </div>
        </div>
      ),
    },
    {
      label: "待更新 Release",
      value: stats.pendingReleaseCount.toString(),
      icon: Rss,
      iconClassName: "text-purple-500",
      to: "/releases",
      tooltip: (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">订阅仓库</span>
            <span className="font-medium">{subscriptionCount}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            规则：Latest Release 发布时间晚于上次查看时间则计为待更新
          </div>
        </div>
      ),
    },
    {
      label: "本月新增",
      value: stats.newStarsThisMonth.toString(),
      icon: Calendar,
      iconClassName: "text-orange-500",
      to: "/repos?sort=starred_at&direction=desc",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const content = (
          <Card className="hover:shadow-md hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon
                  className={`h-8 w-8 ${card.iconClassName} opacity-80 shrink-0`}
                />
              </div>
            </CardContent>
          </Card>
        );

        if (card.tooltip) {
          return (
            <Tooltip key={card.label}>
              <TooltipTrigger asChild>
                <Link to={card.to} className="block">
                  {content}
                </Link>
              </TooltipTrigger>
              <TooltipContent align="start" className="max-w-[280px]">
                {card.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link key={card.label} to={card.to} className="block">
            {content}
          </Link>
        );
      })}
    </div>
  );
}
