import { useCallback, useState } from "react";

export function useIdSelection<TId extends string | number>() {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(() => new Set());

  const toggleId = useCallback((id: TId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectIds = useCallback((ids: Iterable<TId>) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    toggleId,
    selectIds,
    clearSelection,
  };
}
