// GraphQL 响应的最小类型集：只覆盖当前应用查询会用到的字段。

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GraphQLLanguage {
  name: string;
}

export interface GraphQLTopic {
  topic: {
    name: string;
  };
}

export interface GraphQLOwner {
  login: string;
  avatarUrl: string;
}

export interface GraphQLLabel {
  name: string;
  color: string;
}

export interface GraphQLRepository {
  id: string;
  databaseId: number;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  primaryLanguage: GraphQLLanguage | null;
  stargazerCount: number;
  forkCount: number;
  repositoryTopics: {
    nodes: Array<GraphQLTopic | null>;
  };
  owner: GraphQLOwner;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

export interface GraphQLStarredEdge {
  starredAt: string;
  node: GraphQLRepository;
}

export interface StarredReposResponse {
  viewer: {
    starredRepositories: {
      totalCount: number;
      pageInfo: PageInfo;
      edges: Array<GraphQLStarredEdge | null>;
    };
  };
}

export interface GraphQLPullRequest {
  id: string;
  databaseId: number;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  isDraft: boolean;
  repository: {
    nameWithOwner: string;
  };
  author: GraphQLOwner | null;
  labels: {
    nodes: Array<GraphQLLabel | null>;
  };
}

export interface SearchPullRequestsResponse {
  search: {
    issueCount: number;
    pageInfo: PageInfo;
    nodes: Array<GraphQLPullRequest | null>;
  };
}

export interface GraphQLIssue {
  id: string;
  databaseId: number;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repository: {
    nameWithOwner: string;
  };
  author: GraphQLOwner | null;
  labels: {
    nodes: Array<GraphQLLabel | null>;
  };
  comments: {
    totalCount: number;
  };
}

export interface SearchIssuesResponse {
  search: {
    issueCount: number;
    pageInfo: PageInfo;
    nodes: Array<GraphQLIssue | null>;
  };
}

export interface DashboardStatsResponse {
  viewer: {
    login: string;
    starredRepositories: { totalCount: number };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositories: { totalCount: number };
  };
}
