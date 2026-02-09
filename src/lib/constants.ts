export const GITHUB_REST_BASE_URL = "https://api.github.com";
export const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export const API_DEFAULTS = {
  perPage: 100,
} as const;

export const STORAGE_KEYS = {
  auth: "github_stars_auth",
  localData: "github_stars_local_data",
  starsCache: "github_stars_cache",
  starsCacheTimestamp: "github_stars_cache_timestamp",
  issuesCreatedCache: "github_issues_created_cache",
  issuesInvolvedCache: "github_issues_involved_cache",
  prsCreatedCache: "github_prs_created_cache",
  prsInvolvedCache: "github_prs_involved_cache",
  releaseSubscriptions: "github_release_subscriptions",
  aiSettings: "github-stars-ai-settings",
  syncSettings: "github-stars-sync-settings",
} as const;

export const DEFAULT_TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
] as const;
