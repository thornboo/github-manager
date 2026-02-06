import { createContext, useContext, type ReactNode } from "react";
import type { TagsManager } from "@/hooks/state/useTagsManager";

const TagsContext = createContext<TagsManager | undefined>(undefined);

export function TagsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TagsManager;
}) {
  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags() {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error("useTags must be used within a TagsProvider");
  }
  return context;
}
