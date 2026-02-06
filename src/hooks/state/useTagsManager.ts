import { useCallback, useMemo } from "react";
import { DEFAULT_TAG_COLORS } from "@/lib/constants";
import type { RepoTag } from "@/types/local";
import type { LocalDataStore } from "./useLocalDataStore";

export interface TagsManager {
  tags: RepoTag[];
  createTag: (name: string, color?: string) => RepoTag;
  updateTag: (
    tagId: string,
    updates: Partial<Pick<RepoTag, "name" | "color">>,
  ) => void;
  deleteTag: (tagId: string) => void;
  deleteAllTags: () => void;
  getTagById: (tagId: string) => RepoTag | undefined;
  defaultColors: readonly string[];
}

export function useTagsManager(store: LocalDataStore): TagsManager {
  const { data, setData } = store;

  const createTag = useCallback(
    (name: string, color?: string) => {
      const newTag: RepoTag = {
        id: crypto.randomUUID(),
        name: name.trim(),
        color:
          color ||
          DEFAULT_TAG_COLORS[data.tags.length % DEFAULT_TAG_COLORS.length],
      };

      setData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));

      return newTag;
    },
    [data.tags.length, setData],
  );

  const updateTag = useCallback(
    (tagId: string, updates: Partial<Pick<RepoTag, "name" | "color">>) => {
      setData((prev) => ({
        ...prev,
        tags: prev.tags.map((tag) =>
          tag.id === tagId ? { ...tag, ...updates } : tag,
        ),
      }));
    },
    [setData],
  );

  const deleteTag = useCallback(
    (tagId: string) => {
      setData((prev) => {
        // Remove tag from all repos
        const updatedRepoMeta = { ...prev.repoMeta };
        for (const repoId in updatedRepoMeta) {
          updatedRepoMeta[repoId] = {
            ...updatedRepoMeta[repoId],
            tags: updatedRepoMeta[repoId].tags.filter((id) => id !== tagId),
          };
        }

        return {
          tags: prev.tags.filter((tag) => tag.id !== tagId),
          repoMeta: updatedRepoMeta,
        };
      });
    },
    [setData],
  );

  const deleteAllTags = useCallback(() => {
    setData((prev) => {
      // Clear all tags from all repos
      const updatedRepoMeta = { ...prev.repoMeta };
      for (const repoId in updatedRepoMeta) {
        updatedRepoMeta[repoId] = {
          ...updatedRepoMeta[repoId],
          tags: [],
        };
      }

      return {
        tags: [],
        repoMeta: updatedRepoMeta,
      };
    });
  }, [setData]);

  const getTagById = useCallback(
    (tagId: string): RepoTag | undefined => {
      return data.tags.find((tag) => tag.id === tagId);
    },
    [data.tags],
  );

  return useMemo(
    () => ({
      tags: data.tags,
      createTag,
      updateTag,
      deleteTag,
      deleteAllTags,
      getTagById,
      defaultColors: DEFAULT_TAG_COLORS,
    }),
    [data.tags, createTag, updateTag, deleteTag, deleteAllTags, getTagById],
  );
}
