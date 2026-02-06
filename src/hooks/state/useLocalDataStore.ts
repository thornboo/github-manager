import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { RepoMeta, RepoTag } from "@/types/local";

export interface LocalData {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>; // keyed by repo id
}

export interface LocalDataStore {
  data: LocalData;
  setData: Dispatch<SetStateAction<LocalData>>;
}

function loadData(): LocalData {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.localData);
    if (stored) {
      return JSON.parse(stored) as LocalData;
    }
  } catch (e) {
    console.error("Failed to load local data:", e);
  }
  return { tags: [], repoMeta: {} };
}

function saveData(data: LocalData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save local data:", e);
  }
}

export function useLocalDataStore(): LocalDataStore {
  const [data, setData] = useState<LocalData>(() => loadData());

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  return { data, setData };
}
