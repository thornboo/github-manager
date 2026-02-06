import { useEffect, useState } from "react";

export function useResponsiveColumns(
  containerRef: React.RefObject<HTMLElement>,
): number {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;

      if (width < 640) {
        setColumns(1);
      } else if (width < 1024) {
        setColumns(2);
      } else if (width < 1536) {
        setColumns(3);
      } else {
        setColumns(4);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return columns;
}
