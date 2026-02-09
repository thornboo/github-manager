import { useState } from "react";
import { StarredRepo } from "@/types/github";
import { useTags } from "@/contexts/TagsContext";
import { useRepoMeta } from "@/contexts/RepoMetaContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, Plus, X, StickyNote, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepoTagsNotesProps {
  repo: StarredRepo;
  showNote?: boolean;
}

export function RepoTagsNotes({ repo, showNote = false }: RepoTagsNotesProps) {
  const {
    tags,
    getTagById,
    addTagToRepo,
    removeTagFromRepo,
    createTag,
    defaultColors,
  } = useTags();
  const { getRepoMeta, setRepoNote } = useRepoMeta();

  const repoMeta = getRepoMeta(repo.id);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [noteValue, setNoteValue] = useState(repoMeta.note);

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const newTag = createTag(newTagName.trim(), selectedColor);
    addTagToRepo(repo.id, newTag.id);
    setNewTagName("");
    setSelectedColor(defaultColors[0]);
  };

  const handleSaveNote = () => {
    setRepoNote(repo.id, noteValue);
    setIsNotePopoverOpen(false);
  };

  const repoTags = repoMeta.tags
    .map((tagId) => getTagById(tagId))
    .filter(Boolean);

  return (
    <div className="space-y-2">
      {/* 标签区域 */}
      <div className="flex flex-wrap items-center gap-2">
        {repoTags.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              标签:
            </span>
            {repoTags.map(
              (tag) =>
                tag && (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs gap-1 pr-1"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTagFromRepo(repo.id, tag.id);
                      }}
                      className="hover:bg-muted rounded-sm p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ),
            )}
          </>
        )}

        {/* 操作按钮 */}
        <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Tag className="h-3 w-3 mr-1" />
              标签
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">添加标签</p>

              {/* Existing tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => {
                    const isSelected = repoMeta.tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (isSelected) {
                            removeTagFromRepo(repo.id, tag.id);
                          } else {
                            addTagToRepo(repo.id, tag.id);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors",
                          isSelected && "ring-2 ring-offset-1",
                        )}
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Create new tag */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">创建新标签</p>
                <Input
                  placeholder="标签名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTag();
                  }}
                />
                <div className="flex gap-1">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        selectedColor === color &&
                          "ring-2 ring-offset-2 scale-110",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  创建并添加
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Note button */}
        <Popover
          open={isNotePopoverOpen}
          onOpenChange={(open) => {
            setIsNotePopoverOpen(open);
            if (open) {
              setNoteValue(repoMeta.note);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                repoMeta.note && "text-primary",
              )}
            >
              <StickyNote className="h-3 w-3 mr-1" />
              {repoMeta.note ? "编辑备注" : "备注"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">备注</p>
              <Textarea
                placeholder="添加你的备注..."
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNotePopoverOpen(false)}
                >
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveNote}>
                  保存
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 备注区域 */}
      {showNote && repoMeta.note && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            备注:
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {repoMeta.note}
          </p>
        </div>
      )}
    </div>
  );
}
