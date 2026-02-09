import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyncSettings } from "@/hooks/state/useSyncSettings";

interface SyncSettingsFormProps {
  settings: SyncSettings;
  onUpdate: (updates: Partial<SyncSettings>) => void;
  lastSyncTime?: string | null;
}

export function SyncSettingsForm({
  settings,
  onUpdate,
  lastSyncTime,
}: SyncSettingsFormProps) {
  return (
    <Card id="sync" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>同步设置</CardTitle>
        <CardDescription>配置如何从 GitHub 同步您的 Stars 数据</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={settings.mode}
          onValueChange={(value: "auto" | "manual") =>
            onUpdate({ mode: value })
          }
          className="space-y-4"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="auto" id="auto" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="auto" className="font-medium cursor-pointer">
                自动同步
              </Label>
              <p className="text-sm text-muted-foreground">
                每隔指定时间自动从 GitHub 同步 Stars
              </p>
              {settings.mode === "auto" && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">每</span>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.autoSyncInterval}
                    onChange={(e) =>
                      onUpdate({
                        autoSyncInterval: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm">分钟同步一次</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="manual" id="manual" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="manual" className="font-medium cursor-pointer">
                手动同步
              </Label>
              <p className="text-sm text-muted-foreground">
                仅在点击同步按钮时同步
              </p>
            </div>
          </div>
        </RadioGroup>

        {settings.lastSyncedAt && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              上次同步时间：
              {new Date(settings.lastSyncedAt).toLocaleString("zh-CN")}
              {lastSyncTime && ` (${lastSyncTime})`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
