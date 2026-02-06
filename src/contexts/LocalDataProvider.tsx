import { type ReactNode } from "react";
import { useLocalDataStore } from "@/hooks/state/useLocalDataStore";
import { useTagsManager } from "@/hooks/state/useTagsManager";
import { useRepoMetaManager } from "@/hooks/state/useRepoMetaManager";
import { TagsProvider } from "@/contexts/TagsContext";
import { RepoMetaProvider } from "@/contexts/RepoMetaContext";

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const store = useLocalDataStore();
  const tagsManager = useTagsManager(store);
  const repoMetaManager = useRepoMetaManager(store);

  return (
    <TagsProvider value={tagsManager}>
      <RepoMetaProvider value={repoMetaManager}>{children}</RepoMetaProvider>
    </TagsProvider>
  );
}
