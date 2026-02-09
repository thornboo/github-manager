import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCreatedInvolved,
  getCachedCreatedInvolved,
  setCachedCreatedInvolved,
} from "@/hooks/api/created-involved";

describe("created-involved helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds created and involved queries and returns grouped data", async () => {
    const fetchByQuery = vi
      .fn<(query: string) => Promise<number[]>>()
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([3]);

    const result = await fetchCreatedInvolved(fetchByQuery, "alice", "issue");

    expect(fetchByQuery).toHaveBeenCalledTimes(2);
    expect(fetchByQuery).toHaveBeenNthCalledWith(1, "author:alice type:issue");
    expect(fetchByQuery).toHaveBeenNthCalledWith(
      2,
      "involves:alice type:issue -author:alice",
    );
    expect(result).toEqual({ created: [1, 2], involved: [3] });
  });

  it("reads and writes created/involved cache", () => {
    setCachedCreatedInvolved(
      "created_key",
      "involved_key",
      {
        created: [{ id: 1 }],
        involved: [{ id: 2 }],
      },
      "Test",
    );

    const cached = getCachedCreatedInvolved<{ id: number }>(
      "created_key",
      "involved_key",
    );

    expect(cached).toEqual({
      created: [{ id: 1 }],
      involved: [{ id: 2 }],
    });
  });

  it("returns undefined when cache is missing or malformed", () => {
    expect(
      getCachedCreatedInvolved("missing_created", "missing_involved"),
    ).toBeUndefined();

    localStorage.setItem("bad_created", "not-json");
    expect(
      getCachedCreatedInvolved("bad_created", "bad_involved"),
    ).toBeUndefined();
  });
});
