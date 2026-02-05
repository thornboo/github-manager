import { useState, useMemo } from 'react';
import { Star, Plus, FolderOpen, Loader2, Tag, X, Pencil, Lock, Hash, Trash2 } from 'lucide-react';
import { useLists, useCreateList } from '@/hooks/useLists';
import { useStars } from '@/hooks/useStars';
import { useLocalDataContext } from '@/contexts/LocalDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ListEditDialog } from '@/components/stars/ListEditDialog';
import { StarList } from '@/types/github';

interface AppSidebarProps {
  selectedList: string | null;
  onSelectList: (listId: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
}

export function AppSidebar({ selectedList, onSelectList, selectedTag, onSelectTag, selectedTopic, onSelectTopic }: AppSidebarProps) {
  const { data: lists, isLoading } = useLists();
  const { data: stars } = useStars();
  const { tags, repoMeta, deleteTag, deleteAllTags } = useLocalDataContext();

  // Calculate tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(repoMeta).forEach(meta => {
      meta.tags.forEach(tagId => {
        counts[tagId] = (counts[tagId] || 0) + 1;
      });
    });
    return counts;
  }, [repoMeta]);
  const createList = useCreateList();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingList, setEditingList] = useState<StarList | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Aggregate topics from all starred repos
  const allTopics = stars ? (() => {
    const topicCounts: Record<string, number> = {};
    stars.forEach(repo => {
      repo.topics?.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  })() : [];

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      await createList.mutateAsync({ name: newListName.trim() });
      setNewListName('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

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
          onClick={() => {
            handleSelectList(null);
            handleSelectTag(null);
            handleSelectTopic(null);
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            selectedList === null && selectedTag === null && selectedTopic === null
              ? 'bg-muted font-medium'
              : 'hover:bg-muted/50'
          )}
        >
          <Star className="h-4 w-4" />
          <span>全部 Stars</span>
        </button>

        {/* Lists section */}
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
                    if (e.key === 'Enter') handleCreateList();
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
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group',
                    selectedList === list.id
                      ? 'bg-muted font-medium'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <button
                    onClick={() => handleSelectList(list.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <FolderOpen className="h-4 w-4 flex-shrink-0" />
                    {list.isPrivate && <Lock className="h-3 w-3 flex-shrink-0 opacity-70" />}
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
        </div>

        {/* Tags section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              本地标签
            </span>
            {tags.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确定删除所有本地标签吗？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作将删除全部 {tags.length} 个本地标签，并移除所有仓库上的标签关联。此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteAllTags();
                        onSelectTag(null);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除全部
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {tags.length > 0 ? (
            <div className="space-y-1">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group',
                    selectedTag === tag.id
                      ? 'bg-muted font-medium'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <button
                    onClick={() => handleSelectTag(tag.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Tag
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: selectedTag === tag.id ? 'currentColor' : tag.color }}
                    />
                    <span className="truncate flex-1 text-left">{tag.name}</span>
                  </button>
                  <span className="text-xs opacity-70">{tagCounts[tag.id] || 0}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确定删除标签 "{tag.name}" 吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          删除后无法恢复，已添加此标签的仓库将移除该标签。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteTag(tag.id);
                            if (selectedTag === tag.id) {
                              onSelectTag(null);
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2">
              在仓库卡片上创建标签
            </p>
          )}
        </div>

        {/* GitHub Topics section */}
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
                  onClick={() => handleSelectTopic(topic.name)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    selectedTopic === topic.name
                      ? 'bg-muted font-medium'
                      : 'hover:bg-muted/50'
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
                  {showAllTopics ? '收起' : `显示全部 ${allTopics.length} 个 Topics...`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2">
              暂无 Topics
            </p>
          )}
        </div>
      </nav>

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
    </aside>
  );
}
