import type {
  GraphQLIssue,
  GraphQLPullRequest,
  GraphQLStarredEdge,
} from "@/types/graphql";
import type {
  GitHubIssue,
  GitHubPullRequest,
  StarredRepo,
} from "@/types/github";

const REPO_API_PREFIX = "https://api.github.com/repos/";

/**
 * 将 GraphQL 仓库数据转换为应用内部格式（StarredRepo）。
 */
export function transformStarredRepo(edge: GraphQLStarredEdge): StarredRepo {
  const { node, starredAt } = edge;

  return {
    id: node.databaseId,
    name: node.name,
    full_name: node.nameWithOwner,
    description: node.description,
    html_url: node.url,
    homepage: node.homepageUrl,
    language: node.primaryLanguage?.name ?? null,
    stargazers_count: node.stargazerCount,
    forks_count: node.forkCount,
    topics: (node.repositoryTopics.nodes || [])
      .filter(Boolean)
      .map((t) => t!.topic.name),
    owner: {
      login: node.owner.login,
      avatar_url: node.owner.avatarUrl,
    },
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    pushed_at: node.pushedAt,
    starred_at: starredAt,
  };
}

/**
 * 将 GraphQL PR 数据转换为应用内部格式（GitHubPullRequest）。
 * 注意：为了兼容现有 UI（通过 repository_url 解析 owner/repo），这里构造 REST 风格的 repository_url。
 */
export function transformPullRequest(
  pr: GraphQLPullRequest,
): GitHubPullRequest {
  const repositoryUrl = `${REPO_API_PREFIX}${pr.repository.nameWithOwner}`;
  const author = pr.author;

  return {
    id: pr.databaseId,
    number: pr.number,
    title: pr.title,
    body: pr.body ?? null,
    html_url: pr.url,
    state: pr.state === "OPEN" ? "open" : "closed",
    draft: pr.isDraft,
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
    closed_at: pr.closedAt,
    merged_at: pr.mergedAt,
    user: {
      // author 可能为 null（账号删除/不可见），这里给一个稳定兜底，避免 UI 崩溃。
      login: author?.login ?? "unknown",
      avatar_url: author?.avatarUrl ?? "",
    },
    repository_url: repositoryUrl,
    labels: (pr.labels.nodes || []).filter(Boolean).map((l) => ({
      name: l!.name,
      color: l!.color,
    })),
    pull_request: { merged_at: pr.mergedAt },
  };
}

/**
 * 将 GraphQL Issue 数据转换为应用内部格式（GitHubIssue）。
 * 同样构造 REST 风格 repository_url 以复用现有 UI 逻辑。
 */
export function transformIssue(issue: GraphQLIssue): GitHubIssue {
  const repositoryUrl = `${REPO_API_PREFIX}${issue.repository.nameWithOwner}`;
  const author = issue.author;

  return {
    id: issue.databaseId,
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    html_url: issue.url,
    state: issue.state === "OPEN" ? "open" : "closed",
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    closed_at: issue.closedAt,
    user: {
      login: author?.login ?? "unknown",
      avatar_url: author?.avatarUrl ?? "",
    },
    repository_url: repositoryUrl,
    labels: (issue.labels.nodes || []).filter(Boolean).map((l) => ({
      name: l!.name,
      color: l!.color,
    })),
    comments: issue.comments.totalCount,
  };
}
