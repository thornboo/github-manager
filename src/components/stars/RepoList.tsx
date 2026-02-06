import { StarredRepo } from "@/types/github";
import { Badge } from "@/components/ui/badge";
import { Star, GitFork, ExternalLink, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RepoTagsNotes } from "./RepoTagsNotes";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatNumber } from "@/lib/formatting";

interface RepoListProps {
  repos: StarredRepo[];
}

export function RepoList({ repos }: RepoListProps) {
  return (
    <div className="divide-y">
      {repos.map((repo) => (
        <RepoListItem key={repo.id} repo={repo} />
      ))}
    </div>
  );
}

function RepoListItem({ repo }: { repo: StarredRepo }) {
  return (
    <div className="py-4 hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
          <AvatarFallback>
            {repo.owner.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary hover:underline inline-flex items-center gap-1"
            >
              <span className="truncate">{repo.full_name}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
            {repo.language && (
              <Badge variant="secondary" className="text-xs">
                {repo.language}
              </Badge>
            )}
          </div>

          {repo.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {repo.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {formatNumber(repo.stargazers_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3.5 w-3.5" />
              {formatNumber(repo.forks_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(repo.pushed_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>

          {/* Tags and Notes */}
          <div className="mt-2">
            <RepoTagsNotes repo={repo} showNote />
          </div>
        </div>
      </div>
    </div>
  );
}
