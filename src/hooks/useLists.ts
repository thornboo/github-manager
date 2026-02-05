import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { StarList } from '@/types/github';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch lists: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    console.error('GraphQL errors:', data.errors);
    throw new Error(data.errors[0]?.message || 'Failed to fetch lists');
  }

  const lists = data.data?.viewer?.lists?.nodes || [];
  
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    itemsCount: list.items?.totalCount || 0,
  }));
}

async function fetchListStars(token: string, listId: string): Promise<number[]> {
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { listId } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch list stars: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to fetch list stars');
  }

  const items = data.data?.node?.items?.nodes || [];
  return items.map((item) => item.databaseId).filter(Boolean);
}

async function createList(token: string, name: string, description?: string): Promise<StarList> {
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { name, description } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create list: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to create list');
  }

  const list = data.data?.createUserList?.list;
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    itemsCount: 0,
  };
}

async function addRepoToList(token: string, listId: string, repoId: number): Promise<void> {
  // First get the node ID for the repository
  const repoQuery = `
    query($repoId: Int!) {
      repository: node(id: "") {
        id
      }
    }
  `;

  // Get repo node ID via REST first
  const repoResponse = await fetch(`https://api.github.com/repositories/${repoId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!repoResponse.ok) {
    throw new Error('Failed to fetch repository info');
  }

  const repoData = await repoResponse.json();
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables: { listId, repoId: repoNodeId } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add repo to list: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to add repo to list');
  }
}

async function removeRepoFromList(token: string, listId: string, repoId: number): Promise<void> {
  // Get repo node ID via REST first
  const repoResponse = await fetch(`https://api.github.com/repositories/${repoId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!repoResponse.ok) {
    throw new Error('Failed to fetch repository info');
  }

  const repoData = await repoResponse.json();
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables: { listId, repoId: repoNodeId } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove repo from list: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to remove repo from list');
  }
}

export function useLists() {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['lists', accessToken],
    queryFn: () => fetchStarLists(accessToken!),
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useListStars(listId: string | null) {
  const { accessToken, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['listStars', listId, accessToken],
    queryFn: () => fetchListStars(accessToken!, listId!),
    enabled: isAuthenticated && !!accessToken && !!listId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createList(accessToken!, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
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
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['listStars', listId] });
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
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['listStars', listId] });
    },
  });
}

async function updateList(
  token: string,
  listId: string,
  name: string,
  description?: string,
  isPrivate?: boolean
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables: { listId, name, description, isPrivate } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update list: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to update list');
  }

  const list = data.data?.updateUserList?.list;
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

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables: { listId } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete list: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Failed to delete list');
  }
}

export function useUpdateList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, name, description, isPrivate }: { 
      listId: string; 
      name: string; 
      description?: string;
      isPrivate?: boolean;
    }) => updateList(accessToken!, listId, name, description, isPrivate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useDeleteList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deleteList(accessToken!, listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}
