import { useMemo } from "react";
import { Tag, Trash2, X } from "lucide-react";
import { useTags } from "@/contexts/TagsContext";
import { useRepoMeta } from "@/contexts/RepoMetaContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { cn } from "@/lib/utils";

interface SidebarTagsProps {
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
}

export function SidebarTags({ selectedTag, onSelectTag }: SidebarTagsProps) {
  const { tags, deleteTag, deleteAllTags } = useTags();
  const { repoMeta } = useRepoMeta();

  // Calculate tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(repoMeta).forEach((meta) => {
      meta.tags.forEach((tagId) => {
        counts[tagId] = (counts[tagId] || 0) + 1;
      });
    });
    return counts;
  }, [repoMeta]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          本地标签
        </span>
        {tags.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="确定删除所有本地标签吗？"
            description={`此操作将删除全部 ${tags.length} 个本地标签，并移除所有仓库上的标签关联。此操作无法撤销。`}
            confirmText="删除全部"
            confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onConfirm={() => {
              deleteAllTags();
              onSelectTag(null);
            }}
          />
        )}
      </div>

      {tags.length > 0 ? (
        <div className="space-y-1">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group",
                selectedTag === tag.id
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50",
              )}
            >
              <button
                onClick={() => onSelectTag(tag.id)}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <Tag
                  className="h-4 w-4 flex-shrink-0"
                  style={{
                    color: selectedTag === tag.id ? "currentColor" : tag.color,
                  }}
                />
                <span className="truncate flex-1 text-left">{tag.name}</span>
              </button>
              <span className="text-xs opacity-70">
                {tagCounts[tag.id] || 0}
              </span>
              <ConfirmDialog
                trigger={
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                }
                title={`确定删除标签 "${tag.name}" 吗？`}
                description="删除后无法恢复，已添加此标签的仓库将移除该标签。"
                confirmText="删除"
                confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onConfirm={() => {
                  deleteTag(tag.id);
                  if (selectedTag === tag.id) {
                    onSelectTag(null);
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-3 py-2">
          在仓库卡片上创建标签
        </p>
      )}
    </div>
  );
}
