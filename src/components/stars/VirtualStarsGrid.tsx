import { useCallback } from "react";
import type { StarredRepo } from "@/types/github";
import { RepoCard } from "@/components/stars/RepoCard";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualStarsGridProps {
  repos: StarredRepo[];
  selectedRepos: Set<number>;
  onToggleSelect: (repoId: number) => void;
  onAnalyze: (repo: StarredRepo) => void;
  columnCount: number;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

const ESTIMATE_CARD_HEIGHT = 340;
const GAP = 16;

export function VirtualStarsGrid({
  repos,
  selectedRepos,
  onToggleSelect,
  onAnalyze,
  columnCount,
  scrollElementRef,
  className,
}: VirtualStarsGridProps) {
  const safeColumnCount = Math.max(1, columnCount);

  // 使用 lanes 实现“卡片流/瀑布流”虚拟化：每一列作为一个 lane，纵向按实际高度堆叠。
  // 这能保留原 StarsGrid 的紧凑布局（不会出现等高行导致的空洞）。
  const virtualizer = useVirtualizer({
    count: repos.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ESTIMATE_CARD_HEIGHT,
    overscan: 10,
    gap: GAP,
    lanes: safeColumnCount,
    getItemKey: (index) => repos[index]?.id ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const measureElement = virtualizer.measureElement;

  const containerWidth = scrollElementRef.current?.clientWidth ?? 0;
  const laneWidth =
    safeColumnCount === 1
      ? containerWidth
      : (containerWidth - GAP * (safeColumnCount - 1)) / safeColumnCount;

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
      const stride = safeColumnCount;

      switch (e.key) {
        case "ArrowRight":
          nextIndex = index + 1;
          break;
        case "ArrowLeft":
          nextIndex = index - 1;
          break;
        case "ArrowDown":
          nextIndex = index + stride;
          break;
        case "ArrowUp":
          nextIndex = index - stride;
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
      virtualizer.scrollToIndex(nextIndex, { align: "center" });
      focusRepoByIndex(nextIndex);
    },
    [repos.length, safeColumnCount, virtualizer, focusRepoByIndex],
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
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: laneWidth > 0 ? `${laneWidth}px` : "100%",
              transform: `translateX(${
                laneWidth > 0 ? virtualItem.lane * (laneWidth + GAP) : 0
              }px) translateY(${virtualItem.start}px)`,
              willChange: "transform",
            }}
          >
            <RepoCard
              repo={repo}
              isSelected={selectedRepos.has(repo.id)}
              onToggleSelect={onToggleSelect}
              onAnalyze={onAnalyze}
              tabIndex={0}
              role="article"
              data-repo-index={virtualItem.index}
              onKeyDown={(e) => handleItemKeyDown(e, virtualItem.index)}
            />
          </div>
        );
      })}
    </div>
  );
}
