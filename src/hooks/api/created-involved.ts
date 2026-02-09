export interface CreatedInvolved<T> {
  created: T[];
  involved: T[];
}

export type SearchItemType = "issue" | "pr";

function buildSearchQueries(
  username: string,
  itemType: SearchItemType,
): CreatedInvolved<string> {
  return {
    created: `author:${username} type:${itemType}`,
    involved: `involves:${username} type:${itemType} -author:${username}`,
  };
}

export async function fetchCreatedInvolved<T>(
  fetchByQuery: (query: string) => Promise<T[]>,
  username: string,
  itemType: SearchItemType,
): Promise<CreatedInvolved<T>> {
  const queries = buildSearchQueries(username, itemType);
  const [created, involved] = await Promise.all([
    fetchByQuery(queries.created),
    fetchByQuery(queries.involved),
  ]);

  return { created, involved };
}

export function getCachedCreatedInvolved<T>(
  createdKey: string,
  involvedKey: string,
): CreatedInvolved<T> | undefined {
  try {
    const created = localStorage.getItem(createdKey);
    const involved = localStorage.getItem(involvedKey);

    if (!created && !involved) {
      return undefined;
    }

    return {
      created: created ? JSON.parse(created) : [],
      involved: involved ? JSON.parse(involved) : [],
    };
  } catch {
    return undefined;
  }
}

export function setCachedCreatedInvolved<T>(
  createdKey: string,
  involvedKey: string,
  data: CreatedInvolved<T>,
  sourceLabel: string,
): void {
  try {
    localStorage.setItem(createdKey, JSON.stringify(data.created));
    localStorage.setItem(involvedKey, JSON.stringify(data.involved));
  } catch (e) {
    console.warn(`Failed to cache ${sourceLabel} data:`, e);
  }
}
