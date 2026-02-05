export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  visibility: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  archived: boolean;
  disabled: boolean;
  license: {
    key: string;
    name: string;
  } | null;
}

export interface StarredRepo extends GitHubRepo {
  starred_at: string;
}

export interface GitHubList {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items_count: number;
}

export interface StarList {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  itemsCount: number;
}

export interface AuthState {
  user: GitHubUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type ViewMode = 'card' | 'list';

export type SortOption = 'starred_at' | 'stars' | 'updated' | 'name';

export type SortDirection = 'asc' | 'desc';

// Release tracking types
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  author: {
    login: string;
    avatar_url: string;
  };
}

export interface ReleaseSubscription {
  repoFullName: string;
  repoId?: number;
  subscribedAt: string;
  lastCheckedAt?: string;
  latestRelease?: {
    tagName: string;
    name: string | null;
    publishedAt: string;
    htmlUrl: string;
  };
}

export interface ReleaseWithRepo extends GitHubRelease {
  repoFullName: string;
}

// Pull Request 类型
export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  repository_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  pull_request?: {
    merged_at: string | null;
  };
}

// Issue 类型
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  repository_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
}
