import type { GitHubRelease } from "./github";

export interface RepoTag {
  id: string;
  name: string;
  color: string;
}

export interface RepoMeta {
  tags: string[]; // tag ids
  note: string;
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
