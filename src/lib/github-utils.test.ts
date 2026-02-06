import { describe, it, expect } from "vitest";
import { getRepoNameFromUrl, parseRepoFullName } from "@/lib/github-utils";

describe("getRepoNameFromUrl", () => {
  it("should strip GitHub repo API prefix", () => {
    expect(getRepoNameFromUrl("https://api.github.com/repos/owner/repo")).toBe(
      "owner/repo",
    );
  });

  it("should keep unknown urls as-is", () => {
    expect(getRepoNameFromUrl("https://example.com/foo")).toBe(
      "https://example.com/foo",
    );
  });
});

describe("parseRepoFullName", () => {
  it("should parse owner/repo", () => {
    expect(parseRepoFullName("owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should tolerate invalid input", () => {
    expect(parseRepoFullName("ownerOnly")).toEqual({
      owner: "ownerOnly",
      repo: "",
    });
  });
});
