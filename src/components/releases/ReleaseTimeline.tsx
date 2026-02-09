import { ReleaseWithRepo } from "@/types/local";
import { ReleaseCard } from "./ReleaseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Rss } from "lucide-react";
import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  format,
} from "date-fns";
import { zhCN } from "date-fns/locale";

interface ReleaseTimelineProps {
  releases: ReleaseWithRepo[];
  isLoading: boolean;
}

interface GroupedReleases {
  label: string;
  releases: ReleaseWithRepo[];
}

function groupReleasesByDate(releases: ReleaseWithRepo[]): GroupedReleases[] {
  const groups: Map<string, ReleaseWithRepo[]> = new Map();

  releases.forEach((release) => {
    const date = new Date(release.published_at);
    let label: string;

    if (isToday(date)) {
      label = "今天";
    } else if (isYesterday(date)) {
      label = "昨天";
    } else if (isThisWeek(date)) {
      label = "本周";
    } else if (isThisMonth(date)) {
      label = "本月";
    } else {
      label = format(date, "yyyy年M月", { locale: zhCN });
    }

    const existing = groups.get(label) || [];
    groups.set(label, [...existing, release]);
  });

  return Array.from(groups.entries()).map(([label, releases]) => ({
    label,
    releases,
  }));
}

export function ReleaseTimeline({ releases, isLoading }: ReleaseTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Rss className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无更新</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          订阅的仓库暂时没有发布 Release，或者你还没有添加订阅。
        </p>
      </div>
    );
  }

  const groupedReleases = groupReleasesByDate(releases);

  return (
    <div className="space-y-8">
      {groupedReleases.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="font-medium text-sm text-muted-foreground">
              {group.label}
            </h3>
          </div>

          <div className="space-y-3 ml-4 border-l-2 border-muted pl-4">
            {group.releases.map((release) => (
              <ReleaseCard
                key={`${release.repoFullName}-${release.id}`}
                release={release}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
