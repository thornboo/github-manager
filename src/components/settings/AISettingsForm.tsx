import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import {
  AISettings,
  AIProviderConfig,
  AnalysisDepth,
} from "@/hooks/useAISettings";
import { getDefaultSystemPrompt } from "@/lib/prompts";
import { postJson } from "@/lib/api";
import { clearAIAnalysisCache } from "@/lib/ai-analysis-cache";
import { toast } from "sonner";

interface AISettingsFormProps {
  settings: AISettings;
  onUpdate: (updates: Partial<AISettings>) => void;
  onUpdateProvider: (updates: Partial<AIProviderConfig>) => void;
}

export function AISettingsForm({
  settings,
  onUpdate,
  onUpdateProvider,
}: AISettingsFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState<string>("");

  const handleTestConnection = async () => {
    if (!settings.provider.baseUrl || !settings.provider.apiKey) {
      setTestStatus("error");
      setTestError("请先填写 Base URL 和 API Key");
      return;
    }

    setTestStatus("testing");
    setTestError("");

    try {
      const data = await postJson<{ success: boolean; error?: string }>(
        "/api/test-ai-connection",
        {
          baseUrl: settings.provider.baseUrl,
          apiKey: settings.provider.apiKey,
          model: settings.provider.model,
          requestFormat: settings.provider.requestFormat,
        },
      );

      if (data?.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(data?.error || "连接失败");
      }
    } catch (e) {
      setTestStatus("error");
      setTestError(e instanceof Error ? e.message : "连接测试失败");
    }
  };

  const handleClearAnalysisCache = () => {
    clearAIAnalysisCache();
    toast.success("已清空 AI 分析缓存");
  };

  const isProviderConfigured =
    settings.provider.baseUrl && settings.provider.apiKey;
  const defaultSystemPrompt = getDefaultSystemPrompt(
    settings.analysisDepth as AnalysisDepth,
  );
  const isUsingDefaultSystemPrompt = !settings.systemPrompt.trim();

  return (
    <Card id="ai" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>AI 服务配置</CardTitle>
        <CardDescription>
          配置 AI 服务商来自动分析仓库、生成分类建议和标签
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable AI */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled" className="font-medium">
              启用 AI 分析
            </Label>
            <p className="text-sm text-muted-foreground">
              开启后可使用 AI 自动分析仓库功能
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => onUpdate({ enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Provider Configuration */}
            <div
              id="ai-provider"
              className="space-y-4 pt-4 border-t scroll-mt-20"
            >
              <h4 className="font-medium text-sm">服务商配置</h4>

              {/* Base URL */}
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  placeholder="https://api.openai.com/v1"
                  value={settings.provider.baseUrl}
                  onChange={(e) =>
                    onUpdateProvider({ baseUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  API 端点地址，如 OpenAI、Azure、自建服务等
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={settings.provider.apiKey}
                    onChange={(e) =>
                      onUpdateProvider({ apiKey: e.target.value })
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">模型名称</Label>
                <Input
                  id="model"
                  placeholder="gpt-3.5-turbo"
                  value={settings.provider.model}
                  onChange={(e) => onUpdateProvider({ model: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  支持的模型名称，如 gpt-4、claude-3-sonnet、deepseek-chat 等
                </p>
              </div>

              {/* Request Format */}
              <div className="space-y-2">
                <Label htmlFor="request-format">请求格式</Label>
                <Select
                  value={settings.provider.requestFormat}
                  onValueChange={(value: "openai" | "custom") =>
                    onUpdateProvider({ requestFormat: value })
                  }
                >
                  <SelectTrigger id="request-format">
                    <SelectValue placeholder="选择请求格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI 兼容格式</SelectItem>
                    <SelectItem value="custom">
                      自定义格式（暂不支持）
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  大多数 AI 服务商都支持 OpenAI 兼容格式
                </p>
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing" || !isProviderConfigured}
                >
                  {testStatus === "testing" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  测试连接
                </Button>

                {testStatus === "success" && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">连接成功</span>
                  </div>
                )}

                {testStatus === "error" && (
                  <div className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">{testError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Configuration */}
            <div
              id="ai-prompt"
              className="space-y-6 pt-4 border-t scroll-mt-20"
            >
              <h4 className="font-medium text-sm">提示词配置</h4>

              {/* System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="system-prompt">
                    System Prompt（系统提示词）
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate({ systemPrompt: "" })}
                    disabled={isUsingDefaultSystemPrompt}
                    className="h-7 px-2 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    恢复默认
                  </Button>
                </div>
                <Textarea
                  id="system-prompt"
                  value={settings.systemPrompt || defaultSystemPrompt}
                  onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder={defaultSystemPrompt}
                />
                <p className="text-xs text-muted-foreground">
                  定义 AI 的角色和行为规范。留空或点击"恢复默认"使用内置提示词。
                  {!isUsingDefaultSystemPrompt && (
                    <span className="text-amber-600 ml-1">（已自定义）</span>
                  )}
                </p>
              </div>

              {/* User Prompt */}
              <div className="space-y-2">
                <Label htmlFor="user-prompt">User Prompt（用户提示词）</Label>
                <Textarea
                  id="user-prompt"
                  placeholder="可选：添加每次分析时的额外指令，例如：&#10;- 优先使用中文标签&#10;- 关注特定技术栈（如 React, Python）&#10;- 将工具类仓库和学习资源分开"
                  value={settings.userPrompt}
                  onChange={(e) => onUpdate({ userPrompt: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  每次分析时的额外指令，会追加到系统提示词后。
                </p>
              </div>
            </div>

            {/* Analysis Options */}
            <div
              id="ai-options"
              className="space-y-4 pt-4 border-t scroll-mt-20"
            >
              <h4 className="font-medium text-sm">分析选项</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-analyze" className="font-medium">
                    自动分析新 Star
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    当您 Star 新仓库时自动进行分析
                  </p>
                </div>
                <Switch
                  id="auto-analyze"
                  checked={settings.autoAnalyzeNewStars}
                  onCheckedChange={(checked) =>
                    onUpdate({ autoAnalyzeNewStars: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="suggest-lists" className="font-medium">
                    自动建议 Lists 分类
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI 会根据仓库内容推荐合适的 Lists
                  </p>
                </div>
                <Switch
                  id="suggest-lists"
                  checked={settings.suggestLists}
                  onCheckedChange={(checked) =>
                    onUpdate({ suggestLists: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-tags" className="font-medium">
                    自动生成本地标签
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI 会根据仓库特征自动创建并应用标签
                  </p>
                </div>
                <Switch
                  id="auto-tags"
                  checked={settings.autoCreateTags}
                  onCheckedChange={(checked) =>
                    onUpdate({ autoCreateTags: checked })
                  }
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAnalysisCache}
                >
                  清空 AI 分析缓存
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  缓存用于避免重复调用 AI（默认 24 小时，最多 500 条，按 LRU
                  自动驱逐）。清空后下次分析会重新请求。
                </p>
              </div>
            </div>
          </>
        )}

        {settings.lastAnalyzedAt && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              上次分析时间：
              {new Date(settings.lastAnalyzedAt).toLocaleString("zh-CN")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
