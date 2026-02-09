import {
  GitPullRequest,
  GitMerge,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitHubPullRequest } from "@/types/github";
import { getRepoNameFromUrl } from "@/lib/github-utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

// 获取标签的背景颜色（带透明度）
function getLabelBgColor(hexColor: string): string {
  return `#${hexColor}30`;
}

interface PRCardProps {
  pr: GitHubPullRequest;
}

export function PRCard({ pr }: PRCardProps) {
  const repoName = getRepoNameFromUrl(pr.repository_url);
  const isMerged = pr.pull_request?.merged_at !== null;
  const isClosed = pr.state === "closed";
  const isDraft = pr.draft;

  const getStatusInfo = () => {
    if (isMerged) {
      return {
        icon: GitMerge,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        label: "Merged",
      };
    }
    if (isClosed) {
      return {
        icon: XCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        label: "Closed",
      };
    }
    if (isDraft) {
      return {
        icon: Clock,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        label: "Draft",
      };
    }
    return {
      icon: GitPullRequest,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Open",
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", status.bgColor)}>
            <StatusIcon className={cn("h-4 w-4", status.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium leading-snug">
              <a
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline inline-flex items-center gap-1"
              >
                {pr.title}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {repoName} #{pr.number} ·{" "}
              {formatDistanceToNow(new Date(pr.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </p>
          </div>
        </div>
      </CardHeader>
      {pr.labels.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {pr.labels.map((label) => (
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
