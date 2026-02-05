import { ExternalLink, GitFork, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StarredRepo } from '@/types/github';

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

interface RecentStarsProps {
  repos: StarredRepo[];
  isLoading?: boolean;
}

export function RecentStars({ repos, isLoading }: RecentStarsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">最近 Star 的仓库</CardTitle>
        <CardDescription>最近 5 条收藏记录</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-[280px] shrink-0 rounded-lg" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[280px] max-w-[280px] rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="h-9 w-9 rounded-full shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm truncate">{repo.full_name}</div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {repo.description ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {repo.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">暂无描述</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    {formatCompactNumber(repo.stargazers_count)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" />
                    {formatCompactNumber(repo.forks_count)}
                  </span>
                  {repo.language && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                      {repo.language}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Starred{' '}
                  {formatDistanceToNow(new Date(repo.starred_at), { addSuffix: true, locale: zhCN })}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

