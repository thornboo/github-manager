import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { GitHubUser } from "@/types/github";
import { AuthState } from "@/types/ui";
import { STORAGE_KEYS } from "@/lib/constants";
import { GitHubApiClient, GitHubApiError } from "@/lib/github-api";
import { fetchWithGraphQLFallback, isGraphQLEnabled } from "@/lib/graphql-mode";
import { VIEWER_QUERY } from "@/lib/graphql/queries";

interface AuthContextType extends AuthState {
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredAuth {
  accessToken: string;
  user: GitHubUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.auth);
    if (stored) {
      try {
        const { accessToken: token, user: storedUser } = JSON.parse(
          stored,
        ) as StoredAuth;
        setAccessToken(token);
        setUser(storedUser);
      } catch (e) {
        console.error("Failed to parse stored auth:", e);
        localStorage.removeItem(STORAGE_KEYS.auth);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist auth changes
  useEffect(() => {
    if (accessToken && user) {
      localStorage.setItem(
        STORAGE_KEYS.auth,
        JSON.stringify({ accessToken, user }),
      );
    }
  }, [accessToken, user]);

  const login = useCallback(async (token: string) => {
    setIsLoading(true);

    try {
      const client = new GitHubApiClient(token);

      const fetchUserByRest = async (): Promise<GitHubUser> => {
        const userData = await client.rest<{
          id: number;
          login: string;
          name: string | null;
          avatar_url: string;
          html_url: string;
          public_repos: number;
          followers: number;
          following: number;
        }>("/user");

        return {
          id: userData.id,
          login: userData.login,
          name: userData.name,
          avatar_url: userData.avatar_url,
          html_url: userData.html_url,
          public_repos: userData.public_repos,
          followers: userData.followers,
          following: userData.following,
        };
      };

      const fetchUserByGraphQL = async (): Promise<GitHubUser> => {
        const data = await client.graphql<{
          viewer: {
            databaseId: number | null;
            login: string;
            name: string | null;
            avatarUrl: string;
            url: string;
            repositories: { totalCount: number };
            followers: { totalCount: number };
            following: { totalCount: number };
          };
        }>(VIEWER_QUERY);

        const viewer = data.viewer;
        if (!viewer?.databaseId) {
          throw new Error("GraphQL viewer response missing databaseId");
        }

        return {
          id: viewer.databaseId,
          login: viewer.login,
          name: viewer.name,
          avatar_url: viewer.avatarUrl,
          html_url: viewer.url,
          public_repos: viewer.repositories.totalCount,
          followers: viewer.followers.totalCount,
          following: viewer.following.totalCount,
        };
      };

      const user = await fetchWithGraphQLFallback({
        fetchRest: fetchUserByRest,
        fetchGraphQL: fetchUserByGraphQL,
        fallbackMessage: "GraphQL viewer fetch failed, falling back to REST:",
        useGraphQL: isGraphQLEnabled,
      });

      setAccessToken(token);
      setUser(user);
    } catch (e) {
      if (e instanceof GitHubApiError) {
        if (e.status === 401) {
          throw new Error("Token 无效或已过期");
        }
        throw new Error(`验证失败: ${e.status}`);
      }
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEYS.auth);
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
