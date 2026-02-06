import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { AIProviderConfig, AnalysisDepth } from "@/types/ai";

export type { AIProviderConfig, AnalysisDepth } from "@/types/ai";

export interface AISettings {
  enabled: boolean;
  provider: AIProviderConfig;
  autoAnalyzeNewStars: boolean;
  suggestLists: boolean;
  autoCreateTags: boolean;
  systemPrompt: string; // User-editable System Prompt (empty = use default)
  userPrompt: string; // User Prompt (appended to system prompt)
  lastAnalyzedAt: string | null;
  analysisDepth: AnalysisDepth;
}

const defaultSettings: AISettings = {
  enabled: false,
  provider: {
    baseUrl: "",
    apiKey: "",
    model: "gpt-3.5-turbo",
    requestFormat: "openai",
  },
  autoAnalyzeNewStars: false,
  suggestLists: true,
  autoCreateTags: true,
  systemPrompt: "",
  userPrompt: "",
  lastAnalyzedAt: null,
  analysisDepth: "simple",
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.aiSettings);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration: convert old customPrompt to userPrompt
        if (
          parsed.customPrompt !== undefined &&
          parsed.userPrompt === undefined
        ) {
          parsed.userPrompt = parsed.customPrompt;
          delete parsed.customPrompt;
        }
        return { ...defaultSettings, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load AI settings:", e);
    }
    return defaultSettings;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.aiSettings, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save AI settings:", e);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AISettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateProvider = useCallback((updates: Partial<AIProviderConfig>) => {
    setSettings((prev) => ({
      ...prev,
      provider: { ...prev.provider, ...updates },
    }));
  }, []);

  const setLastAnalyzedAt = useCallback((date: Date) => {
    setSettings((prev) => ({ ...prev, lastAnalyzedAt: date.toISOString() }));
  }, []);

  return {
    settings,
    updateSettings,
    updateProvider,
    setLastAnalyzedAt,
  };
}
