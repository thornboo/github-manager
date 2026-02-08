import type {
  AnalysisDepth,
  AIProviderConfig,
  RepoSuggestion,
} from "@/types/ai";

const CACHE_STORAGE_KEY = "ai_analysis_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

type CacheEntry = {
  timestamp: number;
  suggestion: RepoSuggestion;
};

type CacheStore = {
  v: 1;
  entries: Record<string, CacheEntry>;
};

function fnv1aHash(input: string): string {
  // Fast, deterministic, good enough for local cache keys (non-crypto).
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildAIAnalysisContextHash(input: {
  provider: Pick<AIProviderConfig, "baseUrl" | "model" | "requestFormat">;
  depth: AnalysisDepth;
  systemPrompt?: string;
  userPrompt?: string;
  existingLists: Array<{ id: string; name: string }>;
  existingTags: Array<{ id: string; name: string }>;
}): string {
  const lists = (input.existingLists || [])
    .map((l) => l.name.trim())
    .filter(Boolean)
    .sort();
  const tags = (input.existingTags || [])
    .map((t) => t.name.trim())
    .filter(Boolean)
    .sort();

  // Keep it stable across runs: sort arrays, trim strings, and only include
  // fields that actually affect the model output.
  const context = JSON.stringify({
    depth: input.depth,
    provider: {
      baseUrl: input.provider.baseUrl.trim(),
      model: input.provider.model.trim(),
      requestFormat: input.provider.requestFormat,
    },
    systemPrompt: (input.systemPrompt || "").trim(),
    userPrompt: (input.userPrompt || "").trim(),
    lists,
    tags,
  });

  return fnv1aHash(context);
}

function readStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return { v: 1, entries: {} };
    const parsed = JSON.parse(raw) as CacheStore;
    if (!parsed || parsed.v !== 1 || typeof parsed.entries !== "object") {
      return { v: 1, entries: {} };
    }
    return parsed;
  } catch {
    return { v: 1, entries: {} };
  }
}

function writeStore(store: CacheStore): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota/security errors.
  }
}

function pruneExpiredEntries(store: CacheStore, now: number): boolean {
  let changed = false;
  for (const [key, entry] of Object.entries(store.entries)) {
    if (!entry || typeof entry.timestamp !== "number") {
      delete store.entries[key];
      changed = true;
      continue;
    }
    if (now - entry.timestamp > CACHE_TTL_MS) {
      delete store.entries[key];
      changed = true;
    }
  }
  return changed;
}

function buildEntryKey(contextHash: string, repoId: number): string {
  return `${contextHash}:${repoId}`;
}

export function getCachedSuggestion(
  contextHash: string,
  repoId: number,
): RepoSuggestion | null {
  const now = Date.now();
  const store = readStore();
  const changed = pruneExpiredEntries(store, now);

  const entry = store.entries[buildEntryKey(contextHash, repoId)];
  if (changed) writeStore(store);

  if (!entry) return null;
  if (now - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.suggestion || null;
}

export function setCachedSuggestion(
  contextHash: string,
  suggestion: RepoSuggestion,
): void {
  const now = Date.now();
  const store = readStore();
  pruneExpiredEntries(store, now);
  store.entries[buildEntryKey(contextHash, suggestion.repoId)] = {
    timestamp: now,
    suggestion,
  };
  writeStore(store);
}

export function clearAIAnalysisCache(): void {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
