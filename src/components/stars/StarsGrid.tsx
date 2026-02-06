import { useEffect, useMemo, useState } from "react";
import type { StarredRepo } from "@/types/github";
import { RepoCard } from "@/components/stars/RepoCard";

interface StarsGridProps {
  repos: StarredRepo[];
  selectedRepos: Set<number>;
  onToggleSelect: (repoId: number) => void;
  onAnalyze: (repo: StarredRepo) => void;
}

function getGridColumnCount(): number {
  // 与 Tailwind 断点保持一致：md=768px, xl=1280px
  if (typeof window === "undefined") return 1;
  const width = window.innerWidth;
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
}

export function StarsGrid({
  repos,
  selectedRepos,
  onToggleSelect,
  onAnalyze,
}: StarsGridProps) {
  const [gridColumnCount, setGridColumnCount] = useState(getGridColumnCount);

  // 避免 CSS columns 的“按列排序错觉”：按行分配到固定列，视觉顺序与排序一致，同时保持紧凑布局。
  const gridColumns = useMemo(() => {
    const cols: StarredRepo[][] = Array.from(
      { length: Math.max(1, gridColumnCount) },
      () => [],
    );
    repos.forEach((repo, idx) => {
      cols[idx % cols.length].push(repo);
    });
    return cols;
  }, [repos, gridColumnCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setGridColumnCount(getGridColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      {gridColumns.map((col, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {col.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              isSelected={selectedRepos.has(repo.id)}
              onToggleSelect={() => onToggleSelect(repo.id)}
              onAnalyze={() => onAnalyze(repo)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
