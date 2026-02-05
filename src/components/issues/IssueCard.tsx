import { CircleDot, CheckCircle2, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitHubIssue } from '@/types/github';
import { getRepoNameFromUrl } from '@/hooks/useIssues';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 获取标签的背景颜色（带透明度）
function getLabelBgColor(hexColor: string): string {
  return `#${hexColor}30`;
}

interface IssueCardProps {
  issue: GitHubIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const repoName = getRepoNameFromUrl(issue.repository_url);
  const isOpen = issue.state === 'open';

  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            isOpen ? 'bg-green-500/10' : 'bg-purple-500/10'
          )}>
            {isOpen ? (
              <CircleDot className="h-4 w-4 text-green-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium leading-snug">
              <a
                href={issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline inline-flex items-center gap-1"
              >
                {issue.title}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>{repoName} #{issue.number}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true, locale: zhCN })}</span>
              {issue.comments > 0 && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {issue.comments}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      {issue.labels.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((label) => (
              <Badge
                key={label.name}
                variant="outline"
                className="text-xs font-medium text-gray-800 dark:text-white"
                style={{
                  borderColor: `#${label.color}`,
                  backgroundColor: getLabelBgColor(label.color),
                }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
