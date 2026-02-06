const REPO_API_PREFIX = "https://api.github.com/repos/";

// https://api.github.com/repos/owner/repo -> owner/repo
export function getRepoNameFromUrl(repositoryUrl: string): string {
  if (repositoryUrl.startsWith(REPO_API_PREFIX)) {
    return repositoryUrl.slice(REPO_API_PREFIX.length);
  }
  return repositoryUrl;
}

export function parseRepoFullName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner = "", repo = ""] = fullName.split("/");
  return { owner, repo };
}
