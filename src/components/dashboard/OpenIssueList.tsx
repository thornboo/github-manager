import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, CircleDot, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GitHubIssue } from '@/types/github';
import { getRepoNameFromUrl } from '@/hooks/useIssues';

function getLabelBgColor(hexColor: string): string {
  return `#${hexColor}30`;
}

interface OpenIssueListProps {
  issues: GitHubIssue[];
  isLoading?: boolean;
}

export function OpenIssueList({ issues, isLoading }: OpenIssueListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDot className="h-4 w-4 text-blue-500" />
          我的开放 Issue
        </CardTitle>
        <CardDescription>最近更新的 5 条 Open Issue</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            暂无 Open Issue
          </div>
        ) : (
          <div className="space-y-1">
            {issues.map((issue) => {
              const repoName = getRepoNameFromUrl(issue.repository_url);
              return (
                <a
                  key={issue.id}
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={issue.user.avatar_url}
                      alt={issue.user.login}
                      className="h-8 w-8 rounded-full shrink-0 mt-0.5"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground truncate">
                          {repoName}#{issue.number}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true, locale: zhCN })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        <div className="text-sm font-medium truncate flex-1">{issue.title}</div>
                        {issue.comments > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <MessageSquare className="h-3 w-3" />
                            {issue.comments}
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>

                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {issue.labels.slice(0, 3).map((label) => (
                            <Badge
                              key={label.name}
                              variant="outline"
                              className="text-[10px] font-medium text-gray-800 dark:text-white"
                              style={{
                                borderColor: `#${label.color}`,
                                backgroundColor: getLabelBgColor(label.color),
                              }}
                            >
                              {label.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <Link
            to="/issues?state=open&source=all"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            查看全部 Issue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

