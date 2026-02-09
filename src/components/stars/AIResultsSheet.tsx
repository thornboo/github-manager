import { forwardRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Trash2, FileText, ClipboardCopy, Loader2 } from "lucide-react";
import type { RepoSuggestion } from "@/types/ai";
import { toast } from "sonner";

// 子组件：单个建议卡片
function SuggestionCard({
  suggestion,
  onApply,
  onFillNote,
}: {
  suggestion: RepoSuggestion;
  onApply: () => void;
  onFillNote?: (repoId: number, note: string) => void;
}) {
  const handleFillNote = () => {
    if (onFillNote && suggestion.summary) {
      onFillNote(suggestion.repoId, suggestion.summary);
      toast.success("已填充到备注");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm truncate flex-1">
            {suggestion.repoName}
          </h4>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onApply}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            应用
          </Button>
        </div>

        {suggestion.recommendedLists.length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">建议 Lists:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {suggestion.recommendedLists.map((list, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {list}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {suggestion.suggestedTags.length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">建议标签:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {suggestion.suggestedTags.map((tag, i) => (
                <Badge
                  key={i}
                  style={{
                    backgroundColor: tag.color + "30",
                    color: tag.color,
                    borderColor: tag.color,
                  }}
                  className="text-xs"
                >
                  #{tag.name}
                  {tag.isNew && <span className="ml-1 opacity-60">(新)</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {suggestion.summary && (
          <div className="mb-2 bg-muted/50 rounded-md p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                项目总结
              </span>
              {onFillNote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={handleFillNote}
                >
                  <ClipboardCopy className="h-3 w-3 mr-1" />
                  填充到备注
                </Button>
              )}
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {suggestion.summary}
            </p>
          </div>
        )}

        {suggestion.reasoning && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              {suggestion.reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AIResultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: RepoSuggestion[];
  isAnalyzing?: boolean;
  progress?: { completed: number; total: number };
  onApply: (suggestion: RepoSuggestion) => void;
  onApplyAll: () => void;
  onClear: () => void;
  onFillNote?: (repoId: number, note: string) => void;
}

export const AIResultsSheet = forwardRef<HTMLDivElement, AIResultsSheetProps>(
  function AIResultsSheet(
    {
      open,
      onOpenChange,
      suggestions,
      isAnalyzing = false,
      progress,
      onApply,
      onApplyAll,
      onClear,
      onFillNote,
    },
    _ref,
  ) {
    if (suggestions.length === 0 && !isAnalyzing) {
      return null;
    }

    const progressPercent =
      progress && progress.total > 0
        ? (progress.completed / progress.total) * 100
        : 0;

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              分析结果
              {isAnalyzing && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </SheetTitle>
            <SheetDescription>
              {isAnalyzing ? (
                <>
                  正在分析 {progress?.completed || 0}/{progress?.total || 0}{" "}
                  个仓库...
                </>
              ) : (
                <>
                  已分析 {suggestions.length} 个仓库，点击应用将建议的
                  Lists、标签和备注应用到仓库
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {isAnalyzing && progress && progress.total > 0 && (
            <div className="mt-3">
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 mt-4 mb-4">
            <Button size="sm" onClick={onApplyAll} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              应用全部
            </Button>
            <Button size="sm" variant="outline" onClick={onClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  onApply={() => onApply(suggestion)}
                  onFillNote={onFillNote}
                />
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  },
);

AIResultsSheet.displayName = "AIResultsSheet";
