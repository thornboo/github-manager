import { useMemo, useState } from "react";
import { Hash } from "lucide-react";
import { useStars } from "@/hooks/useStars";
import { cn } from "@/lib/utils";

interface SidebarTopicsProps {
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
}

export function SidebarTopics({
  selectedTopic,
  onSelectTopic,
}: SidebarTopicsProps) {
  const { data: stars } = useStars();
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Aggregate topics from all starred repos
  const allTopics = useMemo(() => {
    if (!stars) return [];
    const topicCounts: Record<string, number> = {};
    stars.forEach((repo) => {
      repo.topics?.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [stars]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          GitHub Topics
        </span>
        <span className="text-xs text-muted-foreground">
          {allTopics.length}
        </span>
      </div>

      {allTopics.length > 0 ? (
        <div className="space-y-1">
          {(showAllTopics ? allTopics : allTopics.slice(0, 10)).map((topic) => (
            <button
              key={topic.name}
              onClick={() => onSelectTopic(topic.name)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                selectedTopic === topic.name
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50",
              )}
            >
              <Hash className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{topic.name}</span>
              <span className="text-xs opacity-70">{topic.count}</span>
            </button>
          ))}
          {allTopics.length > 10 && (
            <button
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              {showAllTopics
                ? "收起"
                : `显示全部 ${allTopics.length} 个 Topics...`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-3 py-2">暂无 Topics</p>
      )}
    </div>
  );
}
