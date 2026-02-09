// GraphQL 查询字符串集中管理，避免在各处散落内联 query，便于复用与优化。

// Stars 查询：按 Star 时间倒序，包含 topics 与 starredAt。
export const STARRED_REPOS_QUERY = `
query GetStarredRepos($cursor: String) {
  viewer {
    starredRepositories(
      first: 100
      after: $cursor
      orderBy: { field: STARRED_AT, direction: DESC }
    ) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        starredAt
        node {
          id
          databaseId
          name
          nameWithOwner
          description
          url
          homepageUrl
          primaryLanguage {
            name
          }
          stargazerCount
          forkCount
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
          owner {
            login
            avatarUrl
          }
          createdAt
          updatedAt
          pushedAt
        }
      }
    }
  }
}
`;

// Search PR：使用与 REST Search 类似的 query 语法（如 "author:xxx type:pr"）。
export const SEARCH_PULL_REQUESTS_QUERY = `
query SearchPullRequests($query: String!, $cursor: String) {
  search(query: $query, type: ISSUE, first: 100, after: $cursor) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on PullRequest {
        id
        databaseId
        number
        title
        body
        state
        url
        createdAt
        updatedAt
        closedAt
        mergedAt
        isDraft
        repository {
          nameWithOwner
        }
        author {
          login
          avatarUrl
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
      }
    }
  }
}
`;

// Search Issue：同样使用 query string。
export const SEARCH_ISSUES_QUERY = `
query SearchIssues($query: String!, $cursor: String) {
  search(query: $query, type: ISSUE, first: 100, after: $cursor) {
    issueCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on Issue {
        id
        databaseId
        number
        title
        body
        state
        url
        createdAt
        updatedAt
        closedAt
        repository {
          nameWithOwner
        }
        author {
          login
          avatarUrl
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
        comments {
          totalCount
        }
      }
    }
  }
}
`;

// 获取当前登录用户信息（用于登录校验/展示）。
export const VIEWER_QUERY = `
query GetViewer {
  viewer {
    databaseId
    login
    name
    avatarUrl
    url
    repositories(first: 0) {
      totalCount
    }
    followers(first: 0) {
      totalCount
    }
    following(first: 0) {
      totalCount
    }
  }
}
`;

// 通过 owner/name 获取仓库的 GraphQL 全局 ID（用于 Lists mutation）。
export const REPOSITORY_ID_QUERY = `
query GetRepositoryId($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    nameWithOwner
  }
}
`;
