import { useCallback, useRef } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

export interface UseVirtualListOptions<T> {
  items: T[];
  estimateSize: number;
  overscan?: number;
  horizontal?: boolean;
  getItemKey?: (index: number) => string | number;
  /**
   * 可选：外部提供滚动容器 ref（用于避免嵌套滚动容器）。
   * 未提供时，hook 会创建内部的 parentRef。
   */
  scrollElementRef?: React.RefObject<HTMLDivElement>;
}

export interface UseVirtualListResult {
  parentRef: React.RefObject<HTMLDivElement>;
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (
    index: number,
    align?: "auto" | "start" | "center" | "end",
  ) => void;
  measureElement: (node: HTMLElement | null) => void;
}

export function useVirtualList<T>({
  items,
  estimateSize,
  overscan = 5,
  horizontal = false,
  getItemKey,
  scrollElementRef,
}: UseVirtualListOptions<T>): UseVirtualListResult {
  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollElementRef ?? internalRef;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
    getItemKey,
  });

  const scrollToIndex = useCallback(
    (index: number, align: "auto" | "start" | "center" | "end" = "start") => {
      virtualizer.scrollToIndex(index, { align });
    },
    [virtualizer],
  );

  return {
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToIndex,
    measureElement: virtualizer.measureElement,
  };
}
