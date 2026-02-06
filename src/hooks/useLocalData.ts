import { useTagsManager } from "@/hooks/state/useTagsManager";
import { useRepoMetaManager } from "@/hooks/state/useRepoMetaManager";
import { useLocalDataStore } from "@/hooks/state/useLocalDataStore";

// 兼容旧导出路径：逐步迁移到 types/local
export type { RepoTag, RepoMeta } from "@/types/local";

export function useLocalData() {
  const store = useLocalDataStore();

  return {
    ...useTagsManager(store),
    ...useRepoMetaManager(store),
  };
}
