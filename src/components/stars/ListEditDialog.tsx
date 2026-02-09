import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useUpdateList, useDeleteList } from "@/hooks/api/useLists";
import { StarList } from "@/types/github";

interface ListEditDialogProps {
  list: StarList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function ListEditDialog({
  list,
  open,
  onOpenChange,
  onDeleted,
}: ListEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const updateList = useUpdateList();
  const deleteList = useDeleteList();

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
      setIsPrivate(list.isPrivate);
    }
  }, [list]);

  const handleSave = async () => {
    if (!list || !name.trim()) return;

    try {
      await updateList.mutateAsync({
        listId: list.id,
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update list:", error);
    }
  };

  const handleDelete = async () => {
    if (!list) return;

    try {
      await deleteList.mutateAsync(list.id);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete list:", error);
    }
  };

  const isPending = updateList.isPending || deleteList.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑 List</DialogTitle>
          <DialogDescription>
            修改 List 的名称、描述和隐私设置
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List 名称"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述（可选）"
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private">私有</Label>
              <p className="text-xs text-muted-foreground">
                只有你可以看到私有 List
              </p>
            </div>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <ConfirmDialog
            trigger={
              <Button
                variant="destructive"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            }
            title="确定删除这个 List？"
            description="删除后无法恢复。List 中的仓库不会被取消收藏。"
            confirmText="删除"
            confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onConfirm={handleDelete}
          />

          <Button
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            className="w-full sm:w-auto"
          >
            {updateList.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
