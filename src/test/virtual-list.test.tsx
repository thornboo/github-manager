import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualStarsGrid } from "@/components/stars/VirtualStarsGrid";
import { VirtualStarsList } from "@/components/stars/VirtualStarsList";
import type { StarredRepo } from "@/types/github";

vi.mock("@/components/stars/RepoTagsNotes", () => ({
  RepoTagsNotes: () => null,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(),
}));

import { useVirtualizer } from "@tanstack/react-virtual";

const mockUseVirtualizer = useVirtualizer as unknown as ReturnType<
  typeof vi.fn
>;

function mockRepo(id: number): StarredRepo {
  return {
    id,
    name: `repo-${id}`,
    full_name: `user/repo-${id}`,
    owner: {
      login: "user",
      avatar_url: "https://example.com/avatar.png",
    },
    html_url: `https://github.com/user/repo-${id}`,
    description: `Description ${id}`,
    stargazers_count: 1000 + id,
    forks_count: 100 + id,
    language: "TypeScript",
    topics: [],
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    pushed_at: "2020-01-01T00:00:00Z",
    homepage: null,
    starred_at: "2020-01-01T00:00:00Z",
  };
}

describe("Virtual stars components", () => {
  beforeEach(() => {
    mockUseVirtualizer.mockReset();
  });

  it("VirtualStarsList should render only virtual items", () => {
    mockUseVirtualizer.mockReturnValue({
      getVirtualItems: () => [
        { key: 0, index: 0, start: 0, size: 140 },
        { key: 1, index: 1, start: 140, size: 140 },
        { key: 2, index: 2, start: 280, size: 140 },
      ],
      getTotalSize: () => 10_000,
      scrollToIndex: vi.fn(),
      measureElement: vi.fn(),
    });

    const repos = Array.from({ length: 50 }, (_, i) => mockRepo(i));
    const scrollRef = { current: document.createElement("div") };

    render(
      <VirtualStarsList
        repos={repos}
        selectedRepos={new Set()}
        onToggleSelect={() => {}}
        scrollElementRef={scrollRef}
      />,
    );

    expect(screen.getByText("user/repo-0")).toBeInTheDocument();
    expect(screen.getByText("user/repo-1")).toBeInTheDocument();
    expect(screen.getByText("user/repo-2")).toBeInTheDocument();
    expect(screen.queryByText("user/repo-10")).not.toBeInTheDocument();
  });

  it("VirtualStarsGrid should render only virtual items", () => {
    mockUseVirtualizer.mockReturnValue({
      getVirtualItems: () => [
        { key: 0, index: 0, start: 0, size: 340, lane: 0 },
        { key: 1, index: 1, start: 0, size: 340, lane: 1 },
        { key: 2, index: 2, start: 0, size: 340, lane: 2 },
        { key: 3, index: 3, start: 356, size: 340, lane: 0 },
        { key: 4, index: 4, start: 356, size: 340, lane: 1 },
        { key: 5, index: 5, start: 356, size: 340, lane: 2 },
      ],
      getTotalSize: () => 10_000,
      scrollToIndex: vi.fn(),
      measureElement: vi.fn(),
    });

    const repos = Array.from({ length: 50 }, (_, i) => mockRepo(i));
    const scrollRef = { current: document.createElement("div") };

    render(
      <VirtualStarsGrid
        repos={repos}
        selectedRepos={new Set()}
        onToggleSelect={() => {}}
        onAnalyze={() => {}}
        columnCount={3}
        scrollElementRef={scrollRef}
      />,
    );

    // 仅渲染虚拟项（这里 mock 了 6 个）
    expect(screen.getByText("user/repo-0")).toBeInTheDocument();
    expect(screen.getByText("user/repo-5")).toBeInTheDocument();
    expect(screen.queryByText("user/repo-10")).not.toBeInTheDocument();
  });
});
