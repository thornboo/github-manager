import { describe, expect, it, vi } from "vitest";
import { fetchSearchItems } from "@/hooks/api/search-pagination";
import type { GitHubApiClient } from "@/lib/github-api";

function createClientMock(
  responses: Array<{ total_count: number; items: number[] }>,
) {
  const rest = vi.fn();
  responses.forEach((response) => {
    rest.mockResolvedValueOnce(response);
  });

  return {
    client: { rest } as unknown as GitHubApiClient,
    rest,
  };
}

describe("fetchSearchItems", () => {
  it("aggregates paginated search results", async () => {
    const { client, rest } = createClientMock([
      { total_count: 250, items: Array.from({ length: 100 }, (_, i) => i) },
      {
        total_count: 250,
        items: Array.from({ length: 100 }, (_, i) => i + 100),
      },
      {
        total_count: 250,
        items: Array.from({ length: 50 }, (_, i) => i + 200),
      },
    ]);

    const result = await fetchSearchItems<number>(
      client,
      "author:alice type:issue",
    );

    expect(result).toHaveLength(250);
    expect(rest).toHaveBeenCalledTimes(3);
  });

  it("stops when total_count is reached", async () => {
    const { client, rest } = createClientMock([
      { total_count: 150, items: Array.from({ length: 100 }, (_, i) => i) },
      {
        total_count: 150,
        items: Array.from({ length: 100 }, (_, i) => i + 100),
      },
    ]);

    const result = await fetchSearchItems<number>(
      client,
      "involves:bob type:pr",
    );

    expect(result).toHaveLength(200);
    expect(rest).toHaveBeenCalledTimes(2);
  });

  it("builds encoded query with page parameters", async () => {
    const { client, rest } = createClientMock([{ total_count: 1, items: [1] }]);

    await fetchSearchItems<number>(client, "author:foo/bar type:issue");

    expect(rest).toHaveBeenCalledWith(
      "/search/issues?q=author%3Afoo%2Fbar%20type%3Aissue&sort=updated&order=desc&per_page=100&page=1",
    );
  });
});
