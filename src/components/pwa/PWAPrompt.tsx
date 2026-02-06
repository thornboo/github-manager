import { RefreshCw, Wifi, WifiOff, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";

export function PWAPrompt() {
  const {
    isOnline,
    needRefresh,
    offlineReady,
    updateApp,
    dismissOfflineReady,
    dismissUpdate,
  } = usePWA();

  // 离线提示
  if (!isOnline) {
    return (
      <Alert className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md border-yellow-500 bg-yellow-500/10">
        <WifiOff className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>当前处于离线状态，正在显示缓存数据。</span>
        </AlertDescription>
      </Alert>
    );
  }

  // 更新提示（优先级高于 offlineReady）
  if (needRefresh) {
    return (
      <Alert className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md border-blue-500 bg-blue-500/10">
        <RefreshCw className="h-4 w-4 text-blue-500" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>发现新版本！</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={dismissUpdate}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={updateApp}>
              更新
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // 离线就绪提示（首次）
  if (offlineReady) {
    return (
      <Alert className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md border-green-500 bg-green-500/10">
        <Wifi className="h-4 w-4 text-green-500" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>应用已准备好离线使用。</span>
          <Button size="sm" variant="ghost" onClick={dismissOfflineReady}>
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
