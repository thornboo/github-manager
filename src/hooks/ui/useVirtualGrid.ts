import { useMemo, useRef } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

export interface UseVirtualGridOptions<T> {
  items: T[];
  columnCount: number;
  estimateRowHeight: number;
  gap?: number;
  overscan?: number;
  /**
   * 可选：外部提供滚动容器 ref（用于避免嵌套滚动容器）。
   * 未提供时，hook 会创建内部的 parentRef。
   */
  scrollElementRef?: React.RefObject<HTMLDivElement>;
}

export interface VirtualGridItem<T> {
  item: T;
  index: number;
  rowIndex: number;
  columnIndex: number;
}

export interface UseVirtualGridResult<T> {
  parentRef: React.RefObject<HTMLDivElement>;
  virtualRows: VirtualItem[];
  virtualItems: VirtualGridItem<T>[];
  totalSize: number;
  measureRow: (node: HTMLElement | null) => void;
  scrollToRow: (
    rowIndex: number,
    align?: "auto" | "start" | "center" | "end",
  ) => void;
  scrollToItem: (
    itemIndex: number,
    align?: "auto" | "start" | "center" | "end",
  ) => void;
}

export function useVirtualGrid<T>({
  items,
  columnCount,
  estimateRowHeight,
  gap = 16,
  overscan = 3,
  scrollElementRef,
}: UseVirtualGridOptions<T>): UseVirtualGridResult<T> {
  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollElementRef ?? internalRef;

  const safeColumnCount = Math.max(1, columnCount);
  const rowCount = Math.ceil(items.length / safeColumnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight + gap,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const virtualItems = useMemo(() => {
    const result: VirtualGridItem<T>[] = [];

    for (const virtualRow of virtualRows) {
      const rowIndex = virtualRow.index;
      const startIndex = rowIndex * safeColumnCount;

      for (let col = 0; col < safeColumnCount; col++) {
        const itemIndex = startIndex + col;
        if (itemIndex >= items.length) break;

        result.push({
          item: items[itemIndex],
          index: itemIndex,
          rowIndex,
          columnIndex: col,
        });
      }
    }

    return result;
  }, [virtualRows, items, safeColumnCount]);

  return {
    parentRef,
    virtualRows,
    virtualItems,
    totalSize: virtualizer.getTotalSize(),
    measureRow: virtualizer.measureElement,
    scrollToRow: (
      rowIndex: number,
      align: "auto" | "start" | "center" | "end" = "start",
    ) => virtualizer.scrollToIndex(rowIndex, { align }),
    scrollToItem: (
      itemIndex: number,
      align: "auto" | "start" | "center" | "end" = "start",
    ) =>
      virtualizer.scrollToIndex(Math.floor(itemIndex / safeColumnCount), {
        align,
      }),
  };
}
