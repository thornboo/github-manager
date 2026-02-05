import { RefreshCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncButtonProps {
  isSyncing: boolean;
  onSync: () => void;
  lastSyncTime?: string | null;
  syncStatus: SyncStatus;
  syncError?: string | null;
}

export function SyncButton({ isSyncing, onSync, lastSyncTime, syncStatus, syncError }: SyncButtonProps) {
  const getStatusText = () => {
    if (isSyncing || syncStatus === 'syncing') return '同步中...';
    if (syncStatus === 'error') return '同步失败';
    if (lastSyncTime) return `已同步 · ${lastSyncTime}`;
    return '同步数据';
  };

  const getStatusIcon = () => {
    if (syncStatus === 'success') return <Check className="h-3 w-3 text-green-500" />;
    if (syncStatus === 'error') return <X className="h-3 w-3 text-destructive" />;
    return null;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className={cn(
            "relative gap-2 px-3",
            syncStatus === 'error' && "text-destructive"
          )}
        >
          <RefreshCw
            className={cn(
              'h-4 w-4',
              isSyncing && 'animate-spin'
            )}
          />
          <span className="text-sm hidden sm:inline">{getStatusText()}</span>
          {getStatusIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>同步所有数据</p>
        {syncError && (
          <p className="text-xs text-destructive">{syncError}</p>
        )}
        {lastSyncTime && !syncError && (
          <p className="text-xs text-muted-foreground">上次同步：{lastSyncTime}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
