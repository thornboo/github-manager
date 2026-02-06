import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarLists } from "@/components/layout/SidebarLists";
import { SidebarTags } from "@/components/layout/SidebarTags";
import { SidebarTopics } from "@/components/layout/SidebarTopics";

interface AppSidebarProps {
  selectedList: string | null;
  onSelectList: (listId: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
}

export function AppSidebar({
  selectedList,
  onSelectList,
  selectedTag,
  onSelectTag,
  selectedTopic,
  onSelectTopic,
}: AppSidebarProps) {
  const handleSelectList = (listId: string | null) => {
    onSelectList(listId);
    onSelectTag(null);
    onSelectTopic(null);
  };

  const handleSelectTag = (tagId: string | null) => {
    onSelectTag(tagId);
    onSelectList(null);
    onSelectTopic(null);
  };

  const handleSelectTopic = (topic: string | null) => {
    onSelectTopic(topic);
    onSelectList(null);
    onSelectTag(null);
  };

  const handleSelectAllStars = () => {
    onSelectList(null);
    onSelectTag(null);
    onSelectTopic(null);
  };

  const isAllStarsSelected =
    selectedList === null && selectedTag === null && selectedTopic === null;

  return (
    <aside className="w-64 border-r bg-card flex-shrink-0 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          分类
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* All Stars */}
        <button
          onClick={handleSelectAllStars}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isAllStarsSelected ? "bg-muted font-medium" : "hover:bg-muted/50",
          )}
        >
          <Star className="h-4 w-4" />
          <span>全部 Stars</span>
        </button>

        <SidebarLists
          selectedList={selectedList}
          onSelectList={handleSelectList}
        />
        <SidebarTags selectedTag={selectedTag} onSelectTag={handleSelectTag} />
        <SidebarTopics
          selectedTopic={selectedTopic}
          onSelectTopic={handleSelectTopic}
        />
      </nav>
    </aside>
  );
}
