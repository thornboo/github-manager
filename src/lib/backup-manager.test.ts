import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import {
  collectBackupData,
  createBackup,
  importBackup,
  validateBackup,
} from "@/lib/backup-manager";
import type { BackupData } from "@/types/backup";

describe("backup-manager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("collectBackupData", () => {
    it("should return empty data when localStorage is empty", () => {
      const data = collectBackupData();
      expect(data.tags).toEqual([]);
      expect(data.repoMeta).toEqual({});
      expect(data.releaseSubscriptions).toEqual([]);
    });
  });

  describe("createBackup", () => {
    it("should create valid backup structure", () => {
      const backup = createBackup();
      expect(backup.version).toBeDefined();
      expect(backup.exportedAt).toBeDefined();
      expect(backup.source.app).toBe("github-manager");
      expect(backup.data).toBeDefined();
      expect(backup.checksum).toBeDefined();
    });

    it("should exclude apiKey from aiSettings.provider", () => {
      localStorage.setItem(
        STORAGE_KEYS.aiSettings,
        JSON.stringify({
          enabled: true,
          analysisDepth: "simple",
          provider: {
            baseUrl: "https://api.openai.com/v1",
            apiKey: "secret",
            model: "gpt-4",
            requestFormat: "openai",
          },
          autoAnalyzeNewStars: true,
          suggestLists: true,
          autoCreateTags: true,
          systemPrompt: "",
          userPrompt: "",
          lastAnalyzedAt: null,
        }),
      );

      const backup = createBackup();
      const provider = backup.data.aiSettings?.provider as
        | Record<string, unknown>
        | undefined;
      expect(provider?.apiKey).toBeUndefined();
      expect(provider?.baseUrl).toBe("https://api.openai.com/v1");
    });
  });

  describe("validateBackup", () => {
    it("should reject invalid data", () => {
      const result = validateBackup(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should accept valid backup", () => {
      const backup = createBackup();
      const result = validateBackup(backup);
      expect(result.valid).toBe(true);
    });
  });

  describe("importBackup", () => {
    it("should import in merge mode (keep existing data)", () => {
      localStorage.setItem(
        STORAGE_KEYS.localData,
        JSON.stringify({
          tags: [{ id: "1", name: "existing", color: "#000" }],
          repoMeta: { 100: { tags: ["1"], note: "old" } },
        }),
      );
      localStorage.setItem(
        STORAGE_KEYS.releaseSubscriptions,
        JSON.stringify([
          { repoFullName: "owner/repo", subscribedAt: "2020-01-01T00:00:00Z" },
        ]),
      );

      const backup: BackupData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        source: { app: "github-manager", version: "test" },
        data: {
          tags: [{ id: "2", name: "new", color: "#fff" }],
          repoMeta: { 200: { tags: ["2"], note: "note" } },
          releaseSubscriptions: [
            {
              repoFullName: "owner/another",
              subscribedAt: "2020-01-02T00:00:00Z",
            },
          ],
          syncSettings: { mode: "auto", autoSyncInterval: 10 },
          aiSettings: {
            enabled: true,
            analysisDepth: "simple",
            provider: {
              baseUrl: "https://example.com/v1",
              model: "gpt-4",
              requestFormat: "openai",
            },
          },
        },
      };

      const res = importBackup(backup, "merge");
      expect(res.success).toBe(true);
      expect(res.imported.tags).toBe(1);
      expect(res.imported.repoMeta).toBe(1);
      expect(res.imported.subscriptions).toBe(1);

      const localData = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.localData)!,
      );
      expect(localData.tags).toHaveLength(2);
      expect(Object.keys(localData.repoMeta)).toEqual(
        expect.arrayContaining(["100", "200"]),
      );

      const subs = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.releaseSubscriptions)!,
      );
      expect(subs).toHaveLength(2);
    });

    it("should preserve ai apiKey when importing in replace mode", () => {
      localStorage.setItem(
        STORAGE_KEYS.aiSettings,
        JSON.stringify({
          enabled: false,
          analysisDepth: "simple",
          provider: {
            baseUrl: "https://old.example.com/v1",
            apiKey: "secret",
            model: "gpt-3.5-turbo",
            requestFormat: "openai",
          },
          autoAnalyzeNewStars: false,
          suggestLists: true,
          autoCreateTags: true,
          systemPrompt: "",
          userPrompt: "",
          lastAnalyzedAt: null,
        }),
      );
      localStorage.setItem(
        STORAGE_KEYS.syncSettings,
        JSON.stringify({
          mode: "manual",
          autoSyncInterval: 5,
          lastSyncedAt: "2020-01-01T00:00:00Z",
          lastSyncStatus: "success",
          lastSyncError: null,
        }),
      );

      const backup: BackupData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        source: { app: "github-manager", version: "test" },
        data: {
          tags: [],
          repoMeta: {},
          releaseSubscriptions: [],
          syncSettings: { mode: "auto", autoSyncInterval: 10 },
          aiSettings: {
            enabled: true,
            analysisDepth: "deep",
            provider: {
              baseUrl: "https://new.example.com/v1",
              model: "gpt-4",
              requestFormat: "openai",
            },
            autoAnalyzeNewStars: true,
            suggestLists: false,
            autoCreateTags: false,
            systemPrompt: "sys",
            userPrompt: "user",
          },
        },
      };

      const res = importBackup(backup, "replace");
      expect(res.success).toBe(true);

      const ai = JSON.parse(localStorage.getItem(STORAGE_KEYS.aiSettings)!);
      expect(ai.provider.apiKey).toBe("secret");
      expect(ai.provider.baseUrl).toBe("https://new.example.com/v1");
      expect(ai.analysisDepth).toBe("deep");

      const sync = JSON.parse(localStorage.getItem(STORAGE_KEYS.syncSettings)!);
      expect(sync.mode).toBe("auto");
      expect(sync.autoSyncInterval).toBe(10);
      expect(sync.lastSyncedAt).toBe("2020-01-01T00:00:00Z");
    });
  });
});
