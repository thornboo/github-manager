import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithGraphQLFallback, isGraphQLEnabled } from "@/lib/graphql-mode";
import type { CreatedInvolved } from "@/hooks/api/created-involved";

interface UseCreatedInvolvedQueryOptions<T> {
  resourceKey: string;
  cachedData: CreatedInvolved<T> | undefined;
  fetchRest: (token: string, username: string) => Promise<CreatedInvolved<T>>;
  fetchGraphQL: (
    token: string,
    username: string,
  ) => Promise<CreatedInvolved<T>>;
  graphQLFallbackMessage: string;
}

export function useCreatedInvolvedQuery<T>(
  options: UseCreatedInvolvedQueryOptions<T>,
) {
  const { accessToken, isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: [
      options.resourceKey,
      isGraphQLEnabled ? "graphql" : "rest",
      accessToken,
      user?.login,
    ],
    queryFn: async () => {
      if (!accessToken || !user?.login) {
        throw new Error("Missing user info");
      }

      return fetchWithGraphQLFallback({
        fetchRest: () => options.fetchRest(accessToken, user.login),
        fetchGraphQL: () => options.fetchGraphQL(accessToken, user.login),
        fallbackMessage: options.graphQLFallbackMessage,
        useGraphQL: isGraphQLEnabled,
      });
    },
    enabled: isAuthenticated && !!accessToken && !!user?.login,
    initialData: options.cachedData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
