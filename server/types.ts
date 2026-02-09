export interface RepoInput {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
}

export interface SearchRepoInput extends RepoInput {
  localTags: string[];
  note: string | null;
  lists: string[];
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: "openai" | "custom";
}

export interface NamedItem {
  id: string;
  name: string;
}

export type AnalysisDepth = "quick" | "simple" | "deep";

export type OpenAIToolCall = {
  function?: { name?: string; arguments?: string };
};

export type OpenAIResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: OpenAIToolCall[];
      content?: string;
    };
  }>;
};
