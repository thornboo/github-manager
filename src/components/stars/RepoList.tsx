import { StarredRepo } from "@/types/github";
import { RepoListItem } from "@/components/stars/RepoListItem";

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
