import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import type { SearchMode } from "@/types/ui";

interface StarsSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  isAISearching: boolean;
  onAISearch: () => void;
  aiEnabled: boolean;
}

export function StarsSearchBar({
  search,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  isAISearching,
  onAISearch,
  aiEnabled,
}: StarsSearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      searchMode === "ai" &&
      search.trim() &&
      aiEnabled
    ) {
      onAISearch();
    }
  };

  return (
    <div className="relative flex-1 flex gap-2">
      <div className="relative flex-1">
        {isAISearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : searchMode === "ai" ? (
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          placeholder={
            searchMode === "ai"
              ? "用自然语言描述你要找的仓库..."
              : "搜索仓库名称、描述或标签..."
          }
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
        />
        {search ? (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Search Mode Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={!aiEnabled}
          >
            {searchMode === "ai" ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSearchModeChange("normal")}>
            <Search className="h-4 w-4 mr-2" />
            普通搜索
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSearchModeChange("ai")}
            disabled={!aiEnabled}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI 智能搜索
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AI Search Button (only show when AI mode is active and has query) */}
      {searchMode === "ai" && search.trim() ? (
        <Button
          onClick={onAISearch}
          disabled={isAISearching || !aiEnabled}
          size="sm"
          className="shrink-0"
        >
          {isAISearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "搜索"
          )}
        </Button>
      ) : null}
    </div>
  );
}
