export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: "openai" | "custom";
}

export type AnalysisDepth = "quick" | "simple" | "deep";

export type AnalysisScope = "all" | "uncategorized" | "selected";

export interface RepoSuggestion {
  repoId: number;
  repoName: string;
  recommendedLists: string[];
  suggestedTags: Array<{
    name: string;
    color: string;
    isNew: boolean;
  }>;
  reasoning: string;
  summary: string;
}
