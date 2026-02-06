import type { RepoMeta, RepoTag } from "@/types/local";
import { useTags } from "@/contexts/TagsContext";
import { useRepoMeta } from "@/contexts/RepoMetaContext";

// 兼容旧导出：LocalDataProvider 迁移到 contexts/LocalDataProvider
export { LocalDataProvider } from "@/contexts/LocalDataProvider";

export interface LocalDataContextType {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>;
  createTag: (name: string, color?: string) => RepoTag;
  updateTag: (
    tagId: string,
    updates: Partial<Pick<RepoTag, "name" | "color">>,
  ) => void;
  deleteTag: (tagId: string) => void;
  deleteAllTags: () => void;
  addTagToRepo: (repoId: number, tagId: string) => void;
  removeTagFromRepo: (repoId: number, tagId: string) => void;
  setRepoNote: (repoId: number, note: string) => void;
  getRepoMeta: (repoId: number) => RepoMeta;
  getTagById: (tagId: string) => RepoTag | undefined;
  defaultColors: readonly string[];
}

export function useLocalDataContext(): LocalDataContextType {
  return {
    ...useTags(),
    ...useRepoMeta(),
  };
}
