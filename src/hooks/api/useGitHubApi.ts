import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubApiClient } from "@/lib/github-api";

export function useGitHubApi() {
  const { accessToken } = useAuth();

  return useMemo(() => {
    if (!accessToken) return null;
    return new GitHubApiClient(accessToken);
  }, [accessToken]);
}
