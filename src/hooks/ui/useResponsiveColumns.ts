import { useEffect, useState } from "react";

function computeColumns(viewportWidth: number): number {
  // 与原 StarsGrid/Tailwind 断点保持一致：md=768px, xl=1280px，最多 3 列。
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 1;
  if (viewportWidth >= 1280) return 3;
  if (viewportWidth >= 768) return 2;
  return 1;
}

export function useResponsiveColumns(): number {
  const [columns, setColumns] = useState(() => {
    if (typeof window === "undefined") return 3;
    return computeColumns(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setColumns(computeColumns(window.innerWidth));
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
