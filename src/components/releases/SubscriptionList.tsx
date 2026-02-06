import { ReleaseSubscription } from "@/types/github";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ExternalLink, Trash2, Rss, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SubscriptionListProps {
  subscriptions: ReleaseSubscription[];
  onRemove: (repoFullName: string) => void;
  isLoading?: boolean;
}

export function SubscriptionList({
  subscriptions,
  onRemove,
  isLoading,
}: SubscriptionListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Rss className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无订阅</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          点击右上角的"添加订阅"按钮，开始追踪你感兴趣的仓库 Release 更新。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {subscriptions.map((sub) => (
        <Card
          key={sub.repoFullName}
          className="hover:border-primary/50 transition-colors group"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <a
                    href={`https://github.com/${sub.repoFullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:text-primary transition-colors truncate block"
                  >
                    {sub.repoFullName}
                  </a>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(sub.repoFullName)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {sub.latestRelease ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {sub.latestRelease.tagName}
                  </Badge>
                  <a
                    href={sub.latestRelease.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {sub.latestRelease.name &&
                  sub.latestRelease.name !== sub.latestRelease.tagName && (
                    <p className="text-sm text-muted-foreground truncate">
                      {sub.latestRelease.name}
                    </p>
                  )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(
                      new Date(sub.latestRelease.publishedAt),
                      {
                        addSuffix: true,
                        locale: zhCN,
                      },
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                等待获取 Release 信息...
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
