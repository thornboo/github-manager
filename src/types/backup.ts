import type { AnalysisDepth, AIProviderConfig } from "@/types/ai";
import type { RepoMeta, RepoTag, ReleaseSubscription } from "@/types/local";

export interface BackupMetadata {
  version: string; // 备份格式版本，如 "1.0.0"
  exportedAt: string; // ISO 8601 时间戳
  source: {
    app: "github-manager";
    version: string; // 应用版本（无法获取时为 "unknown"）
  };
}

export interface BackupSyncSettings {
  mode: "auto" | "manual";
  autoSyncInterval: number; // minutes
}

export interface BackupAISettings {
  enabled: boolean;
  analysisDepth: AnalysisDepth;
  provider?: Omit<AIProviderConfig, "apiKey">; // 注意：不导出 apiKey
  autoAnalyzeNewStars: boolean;
  suggestLists: boolean;
  autoCreateTags: boolean;
  systemPrompt: string;
  userPrompt: string;
}

export interface BackupPayload {
  tags: RepoTag[];
  repoMeta: Record<number, RepoMeta>;
  releaseSubscriptions: ReleaseSubscription[];
  syncSettings?: BackupSyncSettings;
  aiSettings?: Partial<BackupAISettings>;
}

export interface BackupData extends BackupMetadata {
  data: BackupPayload;
  checksum?: string;
}

export interface ImportResult {
  success: boolean;
  imported: {
    tags: number;
    repoMeta: number;
    subscriptions: number;
  };
  errors: string[];
  warnings: string[];
}

export type ImportMode = "merge" | "replace";
