import type { GitHubUser } from "./github";

export interface AuthState {
  user: GitHubUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type ViewMode = "card" | "list";

export type SortOption = "starred" | "stars" | "updated" | "name" | "forks";

export type SortDirection = "asc" | "desc";

export type SearchMode = "normal" | "ai";
