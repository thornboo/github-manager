import { createContext, useContext, type ReactNode } from "react";
import type { RepoMetaManager } from "@/hooks/state/useRepoMetaManager";

const RepoMetaContext = createContext<RepoMetaManager | undefined>(undefined);

export function RepoMetaProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RepoMetaManager;
}) {
  return (
    <RepoMetaContext.Provider value={value}>
      {children}
    </RepoMetaContext.Provider>
  );
}

export function useRepoMeta() {
  const context = useContext(RepoMetaContext);
  if (context === undefined) {
    throw new Error("useRepoMeta must be used within a RepoMetaProvider");
  }
  return context;
}
