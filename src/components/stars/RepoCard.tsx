import { memo } from "react";
import { StarredRepo } from "@/types/github";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  GitFork,
  ExternalLink,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RepoTagsNotes } from "./RepoTagsNotes";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatting";
import { getLanguageColors } from "@/lib/language-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RepoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  repo: StarredRepo;
  isSelected?: boolean;
  onToggleSelect?: (repoId: number) => void;
  onAnalyze?: (repo: StarredRepo) => void;
}

export const RepoCard = memo(function RepoCard({
  repo,
  isSelected,
  onToggleSelect,
  onAnalyze,
  className,
  style,
  ...cardProps
}: RepoCardProps) {
  const colors = getLanguageColors(repo.language);

  return (
    <Card
      {...cardProps}
      className={cn(
        "flex flex-col gradient-glass-card group relative transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5",
        className,
      )}
      style={
        {
          "--card-color-left": colors.left,
          "--card-color-right": colors.right,
          ...style,
        } as React.CSSProperties
      }
    >
      {/* Selection checkbox - always visible */}
      {onToggleSelect && (
        <div
          className="absolute top-3 left-3 z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(repo.id);
          }}
        >
          <div
            className={cn(
              "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background/80 border-muted-foreground/40 hover:border-primary",
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}

      {/* AI Analyze button */}
      {onAnalyze && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze(repo);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI 分析此仓库</TooltipContent>
          </Tooltip>
        </div>
      )}

      <CardHeader className={cn("pb-3", onToggleSelect && "pl-10")}>
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-white/10 shadow-lg">
            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {repo.owner.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 overflow-hidden">
            <CardTitle className="text-base truncate">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline inline-flex items-center gap-1 max-w-full transition-colors"
              >
                <span className="truncate">{repo.full_name}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </CardTitle>
            {repo.language && (
              <Badge
                variant="secondary"
                className="mt-1.5 text-xs bg-primary/10 text-primary border-0"
              >
                {repo.language}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <CardDescription
          className="flex-1 line-clamp-3 group-hover:line-clamp-none mb-4 transition-all duration-300"
          title={repo.description || "暂无描述"}
        >
          {repo.description || "暂无描述"}
        </CardDescription>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            {formatNumber(repo.stargazers_count)}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
            <GitFork className="h-3.5 w-3.5" />
            {formatNumber(repo.forks_count)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(repo.pushed_at), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>

        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {repo.topics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-xs bg-primary/8 border-primary/20 text-primary/80 hover:bg-primary/15 hover:text-primary dark:bg-white/8 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/15 dark:hover:text-white/90 transition-colors"
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags and Notes */}
        <div className="border-t border-border pt-3 mt-auto">
          <RepoTagsNotes repo={repo} showNote />
        </div>
      </CardContent>
    </Card>
  );
});
