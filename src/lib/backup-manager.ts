import { STORAGE_KEYS } from "@/lib/constants";
import type {
  BackupAISettings,
  BackupData,
  BackupPayload,
  BackupSyncSettings,
  ImportMode,
  ImportResult,
} from "@/types/backup";
import type { RepoMeta, RepoTag, ReleaseSubscription } from "@/types/local";
import type { AnalysisDepth, AIProviderConfig } from "@/types/ai";

const BACKUP_VERSION = "1.0.0";
const APP_NAME = "github-manager" as const;

type LocalData = {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>;
};

function getAppVersion(): string {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const version = env?.VITE_APP_VERSION;
  if (typeof version === "string" && version.trim()) return version.trim();
  return "unknown";
}

/**
 * 收集所有需要备份的数据（注意：不包含 GitHub Token、缓存等敏感/可重建信息）
 */
export function collectBackupData(): BackupPayload {
  const localData = safeParseJSON<LocalData>(
    localStorage.getItem(STORAGE_KEYS.localData),
    { tags: [], repoMeta: {} },
  );

  const releaseSubscriptions = safeParseJSON<ReleaseSubscription[]>(
    localStorage.getItem(STORAGE_KEYS.releaseSubscriptions),
    [],
  );

  const syncSettings = normalizeSyncSettings(
    safeParseJSON<unknown>(
      localStorage.getItem(STORAGE_KEYS.syncSettings),
      undefined,
    ),
  );

  const aiSettings = sanitizeAISettings(
    safeParseJSON<unknown>(
      localStorage.getItem(STORAGE_KEYS.aiSettings),
      undefined,
    ),
  );

  return {
    tags: Array.isArray(localData.tags) ? localData.tags : [],
    repoMeta: isPlainObject(localData.repoMeta) ? localData.repoMeta : {},
    releaseSubscriptions: Array.isArray(releaseSubscriptions)
      ? releaseSubscriptions
      : [],
    syncSettings,
    aiSettings,
  };
}

/**
 * 生成备份数据对象
 */
export function createBackup(): BackupData {
  const payload = collectBackupData();

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      app: APP_NAME,
      version: getAppVersion(),
    },
    data: payload,
  };

  backup.checksum = generateChecksum(stableStringify(payload));
  return backup;
}

/**
 * 导出备份文件（下载 JSON）
 */
export function exportBackup(): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const date = new Date().toISOString().split("T")[0];
  const filename = `github-manager-backup-${date}.json`;

  downloadBlob(blob, filename);
}

/**
 * 验证备份数据格式
 */
export function validateBackup(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isPlainObject(data)) {
    return { valid: false, errors: ["备份格式无效：不是对象"] };
  }

  const backup = data as Partial<BackupData>;

  if (!backup.version || typeof backup.version !== "string") {
    errors.push("缺少 version 字段");
  }

  if (!backup.exportedAt || typeof backup.exportedAt !== "string") {
    errors.push("缺少 exportedAt 字段");
  }

  if (!backup.source || !isPlainObject(backup.source)) {
    errors.push("缺少 source 字段");
  }

  if (!backup.data || !isPlainObject(backup.data)) {
    errors.push("缺少 data 字段");
  } else {
    const payload = backup.data as Partial<BackupPayload>;
    if (!Array.isArray(payload.tags)) {
      errors.push("tags 格式无效");
    }
    if (!isPlainObject(payload.repoMeta)) {
      errors.push("repoMeta 格式无效");
    }
    if (!Array.isArray(payload.releaseSubscriptions)) {
      errors.push("releaseSubscriptions 格式无效");
    }
  }

  if (backup.checksum && backup.data) {
    const expected = generateChecksum(stableStringify(backup.data));
    if (backup.checksum !== expected) {
      errors.push("校验和不匹配：备份内容可能已被修改或损坏");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 导入备份数据（merge：合并；replace：覆盖）
 */
export function importBackup(
  backup: BackupData,
  mode: ImportMode = "merge",
): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: { tags: 0, repoMeta: 0, subscriptions: 0 },
    errors: [],
    warnings: [],
  };

  try {
    const validation = validateBackup(backup);
    if (!validation.valid) {
      result.errors = validation.errors;
      return result;
    }

    const migrated = migrateBackupData(backup);

    // localData（tags + repoMeta）存储在同一个 key 下
    const existingLocalData = readLocalData();
    const {
      localData: mergedLocalData,
      importedTags,
      importedRepoMeta,
    } = importLocalData(existingLocalData, migrated.data, mode);
    writeLocalData(mergedLocalData);

    result.imported.tags = importedTags;
    result.imported.repoMeta = importedRepoMeta;

    // Release subscriptions（独立 key）
    const existingSubs = readReleaseSubscriptions();
    const { subscriptions: mergedSubs, imported } = importSubscriptions(
      existingSubs,
      migrated.data.releaseSubscriptions,
      mode,
    );
    writeReleaseSubscriptions(mergedSubs);
    result.imported.subscriptions = imported;

    // 设置：仅在 replace 模式导入
    if (mode === "replace") {
      if (migrated.data.syncSettings) {
        const existing = readRawSyncSettings();
        writeRawSyncSettings(
          mergeSyncSettings(existing, migrated.data.syncSettings),
        );
      }

      if (migrated.data.aiSettings) {
        const existing = readRawAISettings();
        writeRawAISettings(mergeAISettings(existing, migrated.data.aiSettings));
      }
    }

    result.success = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "导入失败：未知错误");
  }

  return result;
}

/**
 * 从文件读取并导入
 */
export async function importFromFile(
  file: File,
  mode: ImportMode = "merge",
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return importBackup(data as BackupData, mode);
  } catch (e) {
    return {
      success: false,
      imported: { tags: 0, repoMeta: 0, subscriptions: 0 },
      errors: [e instanceof Error ? e.message : "解析备份文件失败"],
      warnings: [],
    };
  }
}

// ==========================
// helpers
// ==========================

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

function generateChecksum(data: string): string {
  // 简单字符串哈希：足够用于检测意外修改（无需引入 async digest）
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function migrateBackupData(backup: BackupData): BackupData {
  // 当前版本暂无迁移逻辑；后续可按 version 做兼容处理
  return backup;
}

function readLocalData(): LocalData {
  return safeParseJSON<LocalData>(
    localStorage.getItem(STORAGE_KEYS.localData),
    {
      tags: [],
      repoMeta: {},
    },
  );
}

function writeLocalData(localData: LocalData): void {
  localStorage.setItem(STORAGE_KEYS.localData, JSON.stringify(localData));
}

function readReleaseSubscriptions(): ReleaseSubscription[] {
  return safeParseJSON<ReleaseSubscription[]>(
    localStorage.getItem(STORAGE_KEYS.releaseSubscriptions),
    [],
  );
}

function writeReleaseSubscriptions(subscriptions: ReleaseSubscription[]): void {
  localStorage.setItem(
    STORAGE_KEYS.releaseSubscriptions,
    JSON.stringify(subscriptions),
  );
}

function importLocalData(
  existing: LocalData,
  incoming: BackupPayload,
  mode: ImportMode,
): { localData: LocalData; importedTags: number; importedRepoMeta: number } {
  const incomingTags = Array.isArray(incoming.tags) ? incoming.tags : [];
  const incomingRepoMeta = isPlainObject(incoming.repoMeta)
    ? incoming.repoMeta
    : {};

  if (mode === "replace") {
    return {
      localData: {
        tags: incomingTags,
        repoMeta: incomingRepoMeta,
      },
      importedTags: incomingTags.length,
      importedRepoMeta: Object.keys(incomingRepoMeta).length,
    };
  }

  // merge：标签按 id 去重（保留现有），repoMeta 新数据优先
  const existingIds = new Set(existing.tags.map((t) => t.id));
  const newTags = incomingTags.filter((t) => !existingIds.has(t.id));

  return {
    localData: {
      tags: [...existing.tags, ...newTags],
      repoMeta: { ...existing.repoMeta, ...incomingRepoMeta },
    },
    importedTags: newTags.length,
    importedRepoMeta: Object.keys(incomingRepoMeta).length,
  };
}

function importSubscriptions(
  existing: ReleaseSubscription[],
  incoming: ReleaseSubscription[],
  mode: ImportMode,
): { subscriptions: ReleaseSubscription[]; imported: number } {
  const incomingSubs = Array.isArray(incoming) ? incoming : [];

  if (mode === "replace") {
    return { subscriptions: incomingSubs, imported: incomingSubs.length };
  }

  // merge：按 repoFullName（不区分大小写）去重，保留现有的
  const existingNames = new Set(
    existing.map((s) => s.repoFullName.toLowerCase()),
  );
  const newSubs = incomingSubs.filter(
    (s) => !existingNames.has(s.repoFullName.toLowerCase()),
  );

  return {
    subscriptions: [...existing, ...newSubs],
    imported: newSubs.length,
  };
}

function normalizeSyncSettings(value: unknown): BackupSyncSettings | undefined {
  if (!isPlainObject(value)) return undefined;

  const mode =
    value.mode === "auto" || value.mode === "manual" ? value.mode : undefined;
  const autoSyncInterval =
    typeof value.autoSyncInterval === "number" &&
    Number.isFinite(value.autoSyncInterval)
      ? value.autoSyncInterval
      : undefined;

  if (!mode || autoSyncInterval === undefined) return undefined;
  return { mode, autoSyncInterval };
}

function sanitizeAISettings(value: unknown): BackupAISettings | undefined {
  if (!isPlainObject(value)) return undefined;

  const depth: AnalysisDepth =
    value.analysisDepth === "quick" ||
    value.analysisDepth === "simple" ||
    value.analysisDepth === "deep"
      ? value.analysisDepth
      : "simple";

  const userPrompt =
    typeof value.userPrompt === "string"
      ? value.userPrompt
      : typeof (value as { customPrompt?: unknown }).customPrompt === "string"
        ? (value as { customPrompt: string }).customPrompt
        : "";

  const provider = isPlainObject(value.provider)
    ? sanitizeProvider(value.provider)
    : undefined;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    analysisDepth: depth,
    provider,
    autoAnalyzeNewStars:
      typeof value.autoAnalyzeNewStars === "boolean"
        ? value.autoAnalyzeNewStars
        : false,
    suggestLists:
      typeof value.suggestLists === "boolean" ? value.suggestLists : true,
    autoCreateTags:
      typeof value.autoCreateTags === "boolean" ? value.autoCreateTags : true,
    systemPrompt:
      typeof value.systemPrompt === "string" ? value.systemPrompt : "",
    userPrompt,
  };
}

function sanitizeProvider(
  value: Record<string, unknown>,
): Omit<AIProviderConfig, "apiKey"> | undefined {
  const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl : "";
  const model = typeof value.model === "string" ? value.model : "";
  const requestFormat: AIProviderConfig["requestFormat"] =
    value.requestFormat === "custom" ? "custom" : "openai";

  if (!baseUrl && !model) return undefined;

  return { baseUrl, model, requestFormat };
}

function readRawSyncSettings(): Record<string, unknown> {
  const existing = safeParseJSON<unknown>(
    localStorage.getItem(STORAGE_KEYS.syncSettings),
    {},
  );
  return isPlainObject(existing) ? existing : {};
}

function writeRawSyncSettings(value: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEYS.syncSettings, JSON.stringify(value));
}

function mergeSyncSettings(
  existing: Record<string, unknown>,
  incoming: BackupSyncSettings,
): Record<string, unknown> {
  return {
    ...existing,
    mode: incoming.mode,
    autoSyncInterval: incoming.autoSyncInterval,
  };
}

function readRawAISettings(): Record<string, unknown> {
  const existing = safeParseJSON<unknown>(
    localStorage.getItem(STORAGE_KEYS.aiSettings),
    {},
  );
  return isPlainObject(existing) ? existing : {};
}

function writeRawAISettings(value: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEYS.aiSettings, JSON.stringify(value));
}

function mergeAISettings(
  existing: Record<string, unknown>,
  incoming: Partial<BackupAISettings>,
): Record<string, unknown> {
  const existingProvider = isPlainObject(existing.provider)
    ? (existing.provider as Record<string, unknown>)
    : {};
  const existingApiKey =
    typeof existingProvider.apiKey === "string" ? existingProvider.apiKey : "";

  const incomingProvider = isPlainObject(incoming.provider)
    ? (incoming.provider as Record<string, unknown>)
    : undefined;

  const baseUrl =
    incomingProvider && typeof incomingProvider.baseUrl === "string"
      ? incomingProvider.baseUrl
      : typeof existingProvider.baseUrl === "string"
        ? existingProvider.baseUrl
        : "";
  const model =
    incomingProvider && typeof incomingProvider.model === "string"
      ? incomingProvider.model
      : typeof existingProvider.model === "string"
        ? existingProvider.model
        : "gpt-3.5-turbo";
  const requestFormat: AIProviderConfig["requestFormat"] =
    incomingProvider && incomingProvider.requestFormat === "custom"
      ? "custom"
      : incomingProvider && incomingProvider.requestFormat === "openai"
        ? "openai"
        : existingProvider.requestFormat === "custom"
          ? "custom"
          : "openai";

  const userPrompt =
    typeof incoming.userPrompt === "string"
      ? incoming.userPrompt
      : typeof (incoming as { customPrompt?: unknown }).customPrompt ===
          "string"
        ? (incoming as { customPrompt: string }).customPrompt
        : typeof existing.userPrompt === "string"
          ? existing.userPrompt
          : "";

  const analysisDepth: AnalysisDepth =
    incoming.analysisDepth === "quick" ||
    incoming.analysisDepth === "simple" ||
    incoming.analysisDepth === "deep"
      ? incoming.analysisDepth
      : existing.analysisDepth === "quick" ||
          existing.analysisDepth === "simple" ||
          existing.analysisDepth === "deep"
        ? (existing.analysisDepth as AnalysisDepth)
        : "simple";

  return {
    ...existing,
    enabled:
      typeof incoming.enabled === "boolean"
        ? incoming.enabled
        : typeof existing.enabled === "boolean"
          ? existing.enabled
          : false,
    analysisDepth,
    autoAnalyzeNewStars:
      typeof incoming.autoAnalyzeNewStars === "boolean"
        ? incoming.autoAnalyzeNewStars
        : typeof existing.autoAnalyzeNewStars === "boolean"
          ? existing.autoAnalyzeNewStars
          : false,
    suggestLists:
      typeof incoming.suggestLists === "boolean"
        ? incoming.suggestLists
        : typeof existing.suggestLists === "boolean"
          ? existing.suggestLists
          : true,
    autoCreateTags:
      typeof incoming.autoCreateTags === "boolean"
        ? incoming.autoCreateTags
        : typeof existing.autoCreateTags === "boolean"
          ? existing.autoCreateTags
          : true,
    systemPrompt:
      typeof incoming.systemPrompt === "string"
        ? incoming.systemPrompt
        : ((existing.systemPrompt as string | undefined) ?? ""),
    userPrompt,
    provider: {
      baseUrl,
      apiKey: existingApiKey,
      model,
      requestFormat,
    },
  };
}
