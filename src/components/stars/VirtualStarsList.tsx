import { useCallback } from "react";
import { useVirtualList } from "@/hooks/ui/useVirtualList";
import type { StarredRepo } from "@/types/github";
import { RepoListItem } from "@/components/stars/RepoListItem";
import { cn } from "@/lib/utils";

interface VirtualStarsListProps {
  repos: StarredRepo[];
  selectedRepos: Set<number>;
  onToggleSelect: (repoId: number) => void;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

const ESTIMATE_ITEM_HEIGHT = 140;

export function VirtualStarsList({
  repos,
  selectedRepos,
  onToggleSelect,
  scrollElementRef,
  className,
}: VirtualStarsListProps) {
  const { virtualItems, totalSize, measureElement, scrollToIndex } =
    useVirtualList({
      items: repos,
      estimateSize: ESTIMATE_ITEM_HEIGHT,
      overscan: 10,
      getItemKey: (index) => repos[index].id,
      scrollElementRef,
    });

  const focusRepoByIndex = useCallback(
    (index: number) => {
      const container = scrollElementRef.current;
      if (!container) return;

      let attempts = 0;
      const tryFocus = () => {
        const el = container.querySelector<HTMLElement>(
          `[data-repo-index="${index}"]`,
        );
        if (el) {
          el.focus();
          return;
        }
        attempts += 1;
        if (attempts < 10) requestAnimationFrame(tryFocus);
      };
      requestAnimationFrame(tryFocus);
    },
    [scrollElementRef],
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isEditable =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (isEditable) return;

      if (repos.length === 0) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowDown":
          nextIndex = index + 1;
          break;
        case "ArrowUp":
          nextIndex = index - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = repos.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex === null) return;
      nextIndex = Math.max(0, Math.min(repos.length - 1, nextIndex));
      if (nextIndex === index) return;

      e.preventDefault();
      scrollToIndex(nextIndex, "center");
      focusRepoByIndex(nextIndex);
    },
    [repos.length, scrollToIndex, focusRepoByIndex],
  );

  return (
    <div
      className={cn("w-full relative", className)}
      style={{ height: `${totalSize}px`, contain: "strict" }}
    >
      {virtualItems.map((virtualItem) => {
        const repo = repos[virtualItem.index];
        if (!repo) return null;

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={measureElement}
            tabIndex={0}
            role="article"
            data-repo-index={virtualItem.index}
            onKeyDown={(e) => handleItemKeyDown(e, virtualItem.index)}
            className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
              willChange: "transform",
            }}
          >
            <div className="border-b">
              <RepoListItem
                repo={repo}
                isSelected={selectedRepos.has(repo.id)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
