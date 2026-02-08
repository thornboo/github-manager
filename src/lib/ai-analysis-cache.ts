import type {
  AnalysisDepth,
  AIProviderConfig,
  RepoSuggestion,
} from "@/types/ai";

const CACHE_STORAGE_KEY = "ai_analysis_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_MAX_ENTRIES = 500;

export const AI_ANALYSIS_CACHE_TTL_MS = CACHE_TTL_MS;
export const AI_ANALYSIS_CACHE_MAX_ENTRIES = CACHE_MAX_ENTRIES;

type CacheEntry = {
  timestamp: number;
  lastAccessedAt?: number;
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
  } catch (error) {
    // Keep cache writes best-effort, but surface quota issues for diagnosis.
    if (
      typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "QuotaExceededError"
    ) {
      console.warn("AI analysis cache quota exceeded, skip write");
      return;
    }

    // Ignore other storage/security errors.
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

    const normalizedLastAccessedAt =
      typeof entry.lastAccessedAt === "number"
        ? entry.lastAccessedAt
        : entry.timestamp;
    if (entry.lastAccessedAt !== normalizedLastAccessedAt) {
      entry.lastAccessedAt = normalizedLastAccessedAt;
      changed = true;
    }

    if (now - entry.timestamp > CACHE_TTL_MS) {
      delete store.entries[key];
      changed = true;
    }
  }
  return changed;
}

function enforceCapacityByLRU(store: CacheStore): boolean {
  const records = Object.entries(store.entries);
  if (records.length <= CACHE_MAX_ENTRIES) {
    return false;
  }

  const overflow = records.length - CACHE_MAX_ENTRIES;
  const keysToEvict = records
    .sort(([, a], [, b]) => {
      const aAccessTime =
        typeof a.lastAccessedAt === "number" ? a.lastAccessedAt : a.timestamp;
      const bAccessTime =
        typeof b.lastAccessedAt === "number" ? b.lastAccessedAt : b.timestamp;
      return aAccessTime - bAccessTime;
    })
    .slice(0, overflow)
    .map(([key]) => key);

  for (const key of keysToEvict) {
    delete store.entries[key];
  }

  return keysToEvict.length > 0;
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
  let changed = pruneExpiredEntries(store, now);

  const key = buildEntryKey(contextHash, repoId);
  const entry = store.entries[key];

  if (entry && entry.lastAccessedAt !== now) {
    entry.lastAccessedAt = now;
    changed = true;
  }

  if (changed) {
    writeStore(store);
  }

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
    lastAccessedAt: now,
    suggestion,
  };
  enforceCapacityByLRU(store);
  writeStore(store);
}

export function clearAIAnalysisCache(): void {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
