import { useCallback, useMemo } from "react";
import type { RepoMeta } from "@/types/local";
import type { LocalDataStore } from "./useLocalDataStore";

export interface RepoMetaManager {
  repoMeta: Record<number, RepoMeta>;
  addTagToRepo: (repoId: number, tagId: string) => void;
  removeTagFromRepo: (repoId: number, tagId: string) => void;
  setRepoNote: (repoId: number, note: string) => void;
  getRepoMeta: (repoId: number) => RepoMeta;
}

export function useRepoMetaManager(store: LocalDataStore): RepoMetaManager {
  const { data, setData } = store;

  const addTagToRepo = useCallback(
    (repoId: number, tagId: string) => {
      setData((prev) => {
        const existing = prev.repoMeta[repoId] || { tags: [], note: "" };
        if (existing.tags.includes(tagId)) return prev;
        return {
          ...prev,
          repoMeta: {
            ...prev.repoMeta,
            [repoId]: {
              ...existing,
              tags: [...existing.tags, tagId],
            },
          },
        };
      });
    },
    [setData],
  );

  const removeTagFromRepo = useCallback(
    (repoId: number, tagId: string) => {
      setData((prev) => {
        const existing = prev.repoMeta[repoId];
        if (!existing) return prev;
        return {
          ...prev,
          repoMeta: {
            ...prev.repoMeta,
            [repoId]: {
              ...existing,
              tags: existing.tags.filter((id) => id !== tagId),
            },
          },
        };
      });
    },
    [setData],
  );

  const setRepoNote = useCallback(
    (repoId: number, note: string) => {
      setData((prev) => {
        const existing = prev.repoMeta[repoId] || { tags: [], note: "" };
        return {
          ...prev,
          repoMeta: {
            ...prev.repoMeta,
            [repoId]: {
              ...existing,
              note,
            },
          },
        };
      });
    },
    [setData],
  );

  const getRepoMeta = useCallback(
    (repoId: number): RepoMeta => {
      return data.repoMeta[repoId] || { tags: [], note: "" };
    },
    [data.repoMeta],
  );

  return useMemo(
    () => ({
      repoMeta: data.repoMeta,
      addTagToRepo,
      removeTagFromRepo,
      setRepoNote,
      getRepoMeta,
    }),
    [data.repoMeta, addTagToRepo, removeTagFromRepo, setRepoNote, getRepoMeta],
  );
}
