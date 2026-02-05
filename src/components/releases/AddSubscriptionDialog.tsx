import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StarredRepo } from '@/types/github';
import { useVerifyRepo } from '@/hooks/useReleasesFetch';
import { Search, Plus, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starredRepos: StarredRepo[];
  subscribedRepos: string[];
  onAddSubscriptions: (repos: { fullName: string; id?: number }[]) => void;
}

export function AddSubscriptionDialog({
  open,
  onOpenChange,
  starredRepos,
  subscribedRepos,
  onAddSubscriptions,
}: AddSubscriptionDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [customRepo, setCustomRepo] = useState('');
  const [customRepoToVerify, setCustomRepoToVerify] = useState<string | null>(null);

  const { data: verifiedRepo, isLoading: isVerifying, error: verifyError } = useVerifyRepo(customRepoToVerify);

  // Filter starred repos based on search and exclude already subscribed
  const filteredStarredRepos = useMemo(() => {
    const subscribedSet = new Set(subscribedRepos.map(r => r.toLowerCase()));
    
    return starredRepos
      .filter(repo => !subscribedSet.has(repo.full_name.toLowerCase()))
      .filter(repo => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          repo.full_name.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query) ||
          repo.description?.toLowerCase().includes(query)
        );
      });
  }, [starredRepos, subscribedRepos, searchQuery]);

  const handleToggleRepo = (fullName: string) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const handleAddCustomRepo = () => {
    // Parse input - support both "owner/repo" and GitHub URLs
    let repoPath = customRepo.trim();
    
    // Extract from GitHub URL if provided
    const urlMatch = repoPath.match(/github\.com\/([^/]+\/[^/]+)/);
    if (urlMatch) {
      repoPath = urlMatch[1];
    }
    
    // Validate format
    if (!repoPath.includes('/')) {
      toast({
        title: '格式错误',
        description: '请输入 owner/repo 格式的仓库名',
        variant: 'destructive',
      });
      return;
    }

    // Remove any trailing parts (like /issues, /releases, etc.)
    repoPath = repoPath.split('/').slice(0, 2).join('/');
    
    // Check if already selected or subscribed
    if (selectedRepos.has(repoPath) || subscribedRepos.some(r => r.toLowerCase() === repoPath.toLowerCase())) {
      toast({
        title: '已存在',
        description: '该仓库已经在订阅列表中',
      });
      return;
    }

    // Trigger verification
    setCustomRepoToVerify(repoPath);
  };

  // Handle verification result
  useEffect(() => {
    if (verifiedRepo && customRepoToVerify) {
      setSelectedRepos(prev => new Set([...prev, verifiedRepo.full_name]));
      setCustomRepo('');
      setCustomRepoToVerify(null);
      toast({
        title: '添加成功',
        description: `已添加 ${verifiedRepo.full_name}`,
      });
    }
  }, [verifiedRepo, customRepoToVerify, toast]);

  const handleConfirm = () => {
    if (selectedRepos.size === 0) {
      toast({
        title: '请选择仓库',
        description: '至少选择一个仓库进行订阅',
      });
      return;
    }

    const repos = Array.from(selectedRepos).map(fullName => {
      const starred = starredRepos.find(r => r.full_name === fullName);
      return {
        fullName,
        id: starred?.id,
      };
    });

    onAddSubscriptions(repos);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedRepos(new Set());
    setCustomRepo('');
    setCustomRepoToVerify(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>添加 Release 订阅</DialogTitle>
          <DialogDescription>
            选择要订阅的仓库，获取版本更新通知
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索 Star 仓库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>

          {/* Starred repos list */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">从 Star 仓库中选择</Label>
            <ScrollArea className="h-48 rounded-md border">
              {filteredStarredRepos.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {starredRepos.length === 0 
                    ? '暂无 Star 仓库'
                    : searchQuery 
                      ? '没有匹配的仓库'
                      : '所有仓库都已订阅'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredStarredRepos.map(repo => (
                    <label
                      key={repo.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRepos.has(repo.full_name)}
                        onCheckedChange={() => handleToggleRepo(repo.full_name)}
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{repo.full_name}</p>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Separator />

          {/* Custom repo input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">或输入任意公开仓库</Label>
            <div className="flex gap-2">
              <Input
                placeholder="owner/repo 或 GitHub URL"
                value={customRepo}
                onChange={(e) => setCustomRepo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomRepo();
                  }
                }}
              />
              <Button 
                type="button"
                variant="outline" 
                size="icon"
                onClick={handleAddCustomRepo}
                disabled={!customRepo.trim() || isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {verifyError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {verifyError.message}
              </p>
            )}
          </div>

          {/* Selected count */}
          {selectedRepos.size > 0 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedRepos).map(repo => (
                <span 
                  key={repo}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  <Check className="h-3 w-3" />
                  {repo.split('/')[1]}
                </span>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedRepos.size === 0}>
            确认订阅 ({selectedRepos.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
