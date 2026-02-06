import type { StarredRepo } from "@/types/github";
import { RepoList } from "@/components/stars/RepoList";

interface StarsListProps {
  repos: StarredRepo[];
}

export function StarsList({ repos }: StarsListProps) {
  return <RepoList repos={repos} />;
}
