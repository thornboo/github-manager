import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithGraphQLFallback } from "@/lib/graphql-mode";

describe("fetchWithGraphQLFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses REST fetch when GraphQL is disabled", async () => {
    const fetchRest = vi.fn().mockResolvedValue("rest");
    const fetchGraphQL = vi.fn().mockResolvedValue("graphql");

    const result = await fetchWithGraphQLFallback({
      fetchRest,
      fetchGraphQL,
      fallbackMessage: "fallback",
      useGraphQL: false,
    });

    expect(result).toBe("rest");
    expect(fetchRest).toHaveBeenCalledTimes(1);
    expect(fetchGraphQL).not.toHaveBeenCalled();
  });

  it("uses GraphQL fetch when enabled and successful", async () => {
    const fetchRest = vi.fn().mockResolvedValue("rest");
    const fetchGraphQL = vi.fn().mockResolvedValue("graphql");

    const result = await fetchWithGraphQLFallback({
      fetchRest,
      fetchGraphQL,
      fallbackMessage: "fallback",
      useGraphQL: true,
    });

    expect(result).toBe("graphql");
    expect(fetchGraphQL).toHaveBeenCalledTimes(1);
    expect(fetchRest).not.toHaveBeenCalled();
  });

  it("falls back to REST when GraphQL fails", async () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const fetchRest = vi.fn().mockResolvedValue("rest");
    const fetchGraphQL = vi.fn().mockRejectedValue(new Error("graphql failed"));

    const result = await fetchWithGraphQLFallback({
      fetchRest,
      fetchGraphQL,
      fallbackMessage: "fallback",
      useGraphQL: true,
    });

    expect(result).toBe("rest");
    expect(fetchGraphQL).toHaveBeenCalledTimes(1);
    expect(fetchRest).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledTimes(1);
  });
});
