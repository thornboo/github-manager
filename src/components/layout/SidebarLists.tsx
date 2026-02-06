import { useState } from "react";
import { FolderOpen, Loader2, Lock, Pencil, Plus } from "lucide-react";
import { useLists, useCreateList } from "@/hooks/useLists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ListEditDialog } from "@/components/stars/ListEditDialog";
import type { StarList } from "@/types/github";

interface SidebarListsProps {
  selectedList: string | null;
  onSelectList: (listId: string | null) => void;
}

export function SidebarLists({
  selectedList,
  onSelectList,
}: SidebarListsProps) {
  const { data: lists, isLoading } = useLists();
  const createList = useCreateList();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<StarList | null>(null);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      await createList.mutateAsync({ name: newListName.trim() });
      setNewListName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to create list:", error);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          Lists
        </span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新 List</DialogTitle>
              <DialogDescription>
                为你的 Stars 创建一个新的分类列表
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="List 名称"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateList();
              }}
            />
            <DialogFooter>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || createList.isPending}
              >
                {createList.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : lists && lists.length > 0 ? (
        <div className="space-y-1">
          {lists.map((list) => (
            <div
              key={list.id}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group",
                selectedList === list.id
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50",
              )}
            >
              <button
                onClick={() => onSelectList(list.id)}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
                {list.isPrivate && (
                  <Lock className="h-3 w-3 flex-shrink-0 opacity-70" />
                )}
                <span className="truncate flex-1 text-left">{list.name}</span>
              </button>
              <span className="text-xs opacity-70">{list.itemsCount}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingList(list);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-3 py-2">
          还没有创建任何 List
        </p>
      )}

      <ListEditDialog
        list={editingList}
        open={!!editingList}
        onOpenChange={(open) => !open && setEditingList(null)}
        onDeleted={() => {
          if (selectedList === editingList?.id) {
            onSelectList(null);
          }
        }}
      />
    </div>
  );
}
