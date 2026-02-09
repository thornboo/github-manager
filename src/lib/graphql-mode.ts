export const isGraphQLEnabled = import.meta.env.VITE_USE_GRAPHQL !== "false";

interface FetchWithGraphQLFallbackOptions<T> {
  fetchRest: () => Promise<T>;
  fetchGraphQL: () => Promise<T>;
  fallbackMessage: string;
  useGraphQL?: boolean;
}

export async function fetchWithGraphQLFallback<T>(
  options: FetchWithGraphQLFallbackOptions<T>,
): Promise<T> {
  const useGraphQL = options.useGraphQL ?? isGraphQLEnabled;
  if (!useGraphQL) {
    return options.fetchRest();
  }

  try {
    return await options.fetchGraphQL();
  } catch (error) {
    console.warn(options.fallbackMessage, error);
    return options.fetchRest();
  }
}
