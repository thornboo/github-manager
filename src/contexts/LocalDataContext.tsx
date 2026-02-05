import { createContext, useContext, ReactNode } from 'react';
import { useLocalData, RepoTag, RepoMeta } from '@/hooks/useLocalData';

interface LocalDataContextType {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>;
  createTag: (name: string, color?: string) => RepoTag;
  updateTag: (tagId: string, updates: Partial<Pick<RepoTag, 'name' | 'color'>>) => void;
  deleteTag: (tagId: string) => void;
  deleteAllTags: () => void;
  addTagToRepo: (repoId: number, tagId: string) => void;
  removeTagFromRepo: (repoId: number, tagId: string) => void;
  setRepoNote: (repoId: number, note: string) => void;
  getRepoMeta: (repoId: number) => RepoMeta;
  getTagById: (tagId: string) => RepoTag | undefined;
  defaultColors: string[];
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const localData = useLocalData();

  return (
    <LocalDataContext.Provider value={localData}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalDataContext() {
  const context = useContext(LocalDataContext);
  if (context === undefined) {
    throw new Error('useLocalDataContext must be used within a LocalDataProvider');
  }
  return context;
}
