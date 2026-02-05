import { useState, useEffect, useCallback } from 'react';

export interface RepoTag {
  id: string;
  name: string;
  color: string;
}

export interface RepoMeta {
  tags: string[]; // tag ids
  note: string;
}

interface LocalData {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>; // keyed by repo id
}

const STORAGE_KEY = 'github_stars_local_data';

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
];

function loadData(): LocalData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load local data:', e);
  }
  return { tags: [], repoMeta: {} };
}

function saveData(data: LocalData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local data:', e);
  }
}

export function useLocalData() {
  const [data, setData] = useState<LocalData>(() => loadData());

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Tag operations
  const createTag = useCallback((name: string, color?: string) => {
    const newTag: RepoTag = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color || DEFAULT_COLORS[data.tags.length % DEFAULT_COLORS.length],
    };
    setData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }));
    return newTag;
  }, [data.tags.length]);

  const updateTag = useCallback((tagId: string, updates: Partial<Pick<RepoTag, 'name' | 'color'>>) => {
    setData(prev => ({
      ...prev,
      tags: prev.tags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      ),
    }));
  }, []);

  const deleteTag = useCallback((tagId: string) => {
    setData(prev => {
      // Remove tag from all repos
      const updatedRepoMeta = { ...prev.repoMeta };
      for (const repoId in updatedRepoMeta) {
        updatedRepoMeta[repoId] = {
          ...updatedRepoMeta[repoId],
          tags: updatedRepoMeta[repoId].tags.filter(id => id !== tagId),
        };
      }
      return {
        tags: prev.tags.filter(tag => tag.id !== tagId),
        repoMeta: updatedRepoMeta,
      };
    });
  }, []);

  const deleteAllTags = useCallback(() => {
    setData(prev => {
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
  }, []);

  // Repo meta operations
  const addTagToRepo = useCallback((repoId: number, tagId: string) => {
    setData(prev => {
      const existing = prev.repoMeta[repoId] || { tags: [], note: '' };
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
  }, []);

  const removeTagFromRepo = useCallback((repoId: number, tagId: string) => {
    setData(prev => {
      const existing = prev.repoMeta[repoId];
      if (!existing) return prev;
      return {
        ...prev,
        repoMeta: {
          ...prev.repoMeta,
          [repoId]: {
            ...existing,
            tags: existing.tags.filter(id => id !== tagId),
          },
        },
      };
    });
  }, []);

  const setRepoNote = useCallback((repoId: number, note: string) => {
    setData(prev => {
      const existing = prev.repoMeta[repoId] || { tags: [], note: '' };
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
  }, []);

  const getRepoMeta = useCallback((repoId: number): RepoMeta => {
    return data.repoMeta[repoId] || { tags: [], note: '' };
  }, [data.repoMeta]);

  const getTagById = useCallback((tagId: string): RepoTag | undefined => {
    return data.tags.find(tag => tag.id === tagId);
  }, [data.tags]);

  return {
    tags: data.tags,
    repoMeta: data.repoMeta,
    createTag,
    updateTag,
    deleteTag,
    deleteAllTags,
    addTagToRepo,
    removeTagFromRepo,
    setRepoNote,
    getRepoMeta,
    getTagById,
    defaultColors: DEFAULT_COLORS,
  };
}
