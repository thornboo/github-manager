import { describe, expect, it } from "vitest";
import {
  transformIssue,
  transformPullRequest,
  transformStarredRepo,
} from "@/lib/graphql/transformers";
import type {
  GraphQLIssue,
  GraphQLPullRequest,
  GraphQLStarredEdge,
} from "@/types/graphql";

describe("GraphQL transformers", () => {
  it("transformStarredRepo should map GraphQL edge to StarredRepo", () => {
    const edge: GraphQLStarredEdge = {
      starredAt: "2024-01-01T00:00:00Z",
      node: {
        id: "R_kgDOAAAAAA",
        databaseId: 123,
        name: "test-repo",
        nameWithOwner: "user/test-repo",
        description: "Test description",
        url: "https://github.com/user/test-repo",
        homepageUrl: null,
        primaryLanguage: { name: "TypeScript" },
        stargazerCount: 100,
        forkCount: 10,
        repositoryTopics: {
          nodes: [{ topic: { name: "react" } }],
        },
        owner: {
          login: "user",
          avatarUrl: "https://avatars.githubusercontent.com/u/1",
        },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        pushedAt: "2024-01-01T00:00:00Z",
      },
    };

    const result = transformStarredRepo(edge);
    expect(result.id).toBe(123);
    expect(result.full_name).toBe("user/test-repo");
    expect(result.language).toBe("TypeScript");
    expect(result.topics).toEqual(["react"]);
    expect(result.starred_at).toBe("2024-01-01T00:00:00Z");
  });

  it("transformPullRequest should map GraphQL PR to GitHubPullRequest", () => {
    const pr: GraphQLPullRequest = {
      id: "PR_kgDOAAAAAA",
      databaseId: 456,
      number: 7,
      title: "Fix: something",
      body: "Hello",
      state: "MERGED",
      url: "https://github.com/user/test-repo/pull/7",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      closedAt: "2024-01-03T00:00:00Z",
      mergedAt: "2024-01-03T00:00:00Z",
      isDraft: false,
      repository: { nameWithOwner: "user/test-repo" },
      author: {
        login: "user",
        avatarUrl: "https://avatars.githubusercontent.com/u/1",
      },
      labels: { nodes: [{ name: "bug", color: "ff0000" }] },
    };

    const result = transformPullRequest(pr);
    expect(result.id).toBe(456);
    expect(result.state).toBe("closed");
    expect(result.pull_request?.merged_at).toBe("2024-01-03T00:00:00Z");
    expect(result.repository_url).toBe(
      "https://api.github.com/repos/user/test-repo",
    );
    expect(result.labels[0]?.name).toBe("bug");
  });

  it("transformIssue should map GraphQL issue to GitHubIssue", () => {
    const issue: GraphQLIssue = {
      id: "I_kgDOAAAAAA",
      databaseId: 789,
      number: 42,
      title: "Issue title",
      body: "Body",
      state: "OPEN",
      url: "https://github.com/user/test-repo/issues/42",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      closedAt: null,
      repository: { nameWithOwner: "user/test-repo" },
      author: null,
      labels: { nodes: [] },
      comments: { totalCount: 3 },
    };

    const result = transformIssue(issue);
    expect(result.id).toBe(789);
    expect(result.state).toBe("open");
    expect(result.comments).toBe(3);
    expect(result.user.login).toBe("unknown");
    expect(result.repository_url).toBe(
      "https://api.github.com/repos/user/test-repo",
    );
  });
});
