import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StarList } from "@/types/github";
import { GitHubApiClient } from "@/lib/github-api";

async function fetchStarLists(token: string): Promise<StarList[]> {
  const query = `
    query {
      viewer {
        lists(first: 100) {
          nodes {
            id
            name
            description
            isPrivate
            items(first: 1) {
              totalCount
            }
          }
        }
      }
    }
  `;

  const client = new GitHubApiClient(token);
  const data = await client.graphql<{
    viewer?: {
      lists?: {
        nodes?: Array<{
          id: string;
          name: string;
          description: string | null;
          isPrivate: boolean;
          items?: { totalCount: number } | null;
        } | null> | null;
      } | null;
    };
  }>(query);

  const lists = data.viewer?.lists?.nodes || [];
  return lists.filter(Boolean).map((list) => ({
    id: list!.id,
    name: list!.name,
    description: list!.description,
    isPrivate: list!.isPrivate,
    itemsCount: list!.items?.totalCount || 0,
  }));
}

async function fetchListStars(
  token: string,
  listId: string,
): Promise<number[]> {
  const query = `
    query($listId: ID!) {
      node(id: $listId) {
        ... on UserList {
          items(first: 100) {
            nodes {
              ... on Repository {
                databaseId
              }
            }
          }
        }
      }
    }
  `;

  const client = new GitHubApiClient(token);
  const data = await client.graphql<{
    node?: {
      items?: {
        nodes?: Array<{ databaseId?: number | null } | null> | null;
      } | null;
    } | null;
  }>(query, { listId });

  const items = data.node?.items?.nodes || [];
  return items
    .map((item) => item?.databaseId)
    .filter((id): id is number => typeof id === "number");
}

async function createList(
  token: string,
  name: string,
  description?: string,
): Promise<StarList> {
  const query = `
    mutation($name: String!, $description: String) {
      createUserList(input: { name: $name, description: $description, isPrivate: false }) {
        list {
          id
          name
          description
          isPrivate
        }
      }
    }
  `;

  const client = new GitHubApiClient(token);
  const data = await client.graphql<{
    createUserList?: {
      list?: {
        id: string;
        name: string;
        description: string | null;
        isPrivate: boolean;
      } | null;
    } | null;
  }>(query, { name, description });

  const list = data.createUserList?.list;
  if (!list) {
    throw new Error("Failed to create list");
  }
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    itemsCount: 0,
  };
}

async function addRepoToList(
  token: string,
  listId: string,
  repoId: number,
): Promise<void> {
  const client = new GitHubApiClient(token);
  // 先用 REST 拿到仓库的 node_id（GraphQL mutation 需要）
  const repoData = await client.rest<{ node_id: string }>(
    `/repositories/${repoId}`,
  );
  const repoNodeId = repoData.node_id;

  const mutation = `
    mutation($listId: ID!, $repoId: ID!) {
      addUserListItems(input: { listId: $listId, itemIds: [$repoId] }) {
        list {
          id
        }
      }
    }
  `;

  await client.graphql(mutation, { listId, repoId: repoNodeId });
}

async function removeRepoFromList(
  token: string,
  listId: string,
  repoId: number,
): Promise<void> {
  const client = new GitHubApiClient(token);
  // 先用 REST 拿到仓库的 node_id（GraphQL mutation 需要）
  const repoData = await client.rest<{ node_id: string }>(
    `/repositories/${repoId}`,
  );
  const repoNodeId = repoData.node_id;

  const mutation = `
    mutation($listId: ID!, $repoId: ID!) {
      removeUserListItems(input: { listId: $listId, itemIds: [$repoId] }) {
        list {
          id
        }
      }
    }
  `;

  await client.graphql(mutation, { listId, repoId: repoNodeId });
}

export function useLists() {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["lists", accessToken],
    queryFn: () => fetchStarLists(accessToken!),
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useListStars(listId: string | null) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["listStars", listId, accessToken],
    queryFn: () => fetchListStars(accessToken!, listId!),
    enabled: isAuthenticated && !!accessToken && !!listId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => createList(accessToken!, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useAddToList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, repoId }: { listId: string; repoId: number }) =>
      addRepoToList(accessToken!, listId, repoId),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["listStars", listId] });
    },
  });
}

export function useRemoveFromList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, repoId }: { listId: string; repoId: number }) =>
      removeRepoFromList(accessToken!, listId, repoId),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["listStars", listId] });
    },
  });
}

async function updateList(
  token: string,
  listId: string,
  name: string,
  description?: string,
  isPrivate?: boolean,
): Promise<StarList> {
  const mutation = `
    mutation($listId: ID!, $name: String!, $description: String, $isPrivate: Boolean) {
      updateUserList(input: { listId: $listId, name: $name, description: $description, isPrivate: $isPrivate }) {
        list {
          id
          name
          description
          isPrivate
          items(first: 1) {
            totalCount
          }
        }
      }
    }
  `;

  const client = new GitHubApiClient(token);
  const data = await client.graphql<{
    updateUserList?: {
      list?: {
        id: string;
        name: string;
        description: string | null;
        isPrivate: boolean;
        items?: { totalCount: number } | null;
      } | null;
    } | null;
  }>(mutation, { listId, name, description, isPrivate });

  const list = data.updateUserList?.list;
  if (!list) {
    throw new Error("Failed to update list");
  }
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    itemsCount: list.items?.totalCount || 0,
  };
}

async function deleteList(token: string, listId: string): Promise<void> {
  const mutation = `
    mutation($listId: ID!) {
      deleteUserList(input: { listId: $listId }) {
        user {
          id
        }
      }
    }
  `;

  const client = new GitHubApiClient(token);
  await client.graphql(mutation, { listId });
}

export function useUpdateList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      name,
      description,
      isPrivate,
    }: {
      listId: string;
      name: string;
      description?: string;
      isPrivate?: boolean;
    }) => updateList(accessToken!, listId, name, description, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useDeleteList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deleteList(accessToken!, listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
