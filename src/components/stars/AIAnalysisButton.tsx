import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Sparkles, 
  Zap, 
  FileText, 
  Brain,
  Pause,
  Play,
  X,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RepoSuggestion } from '@/hooks/useAIAnalysis';

export type AnalysisScope = 'all' | 'uncategorized' | 'selected';
export type AnalysisDepth = 'quick' | 'simple' | 'deep';

interface AIAnalysisButtonProps {
  totalCount: number;
  uncategorizedCount: number;
  selectedCount: number;
  isAnalyzing: boolean;
  isPaused: boolean;
  progress: { completed: number; total: number };
  suggestions: RepoSuggestion[];
  depth: AnalysisDepth;
  onDepthChange: (depth: AnalysisDepth) => void;
  onAnalyze: (scope: AnalysisScope, depth: AnalysisDepth) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onViewResults: () => void;
  disabled?: boolean;
}

const DEPTH_OPTIONS = [
  { value: 'quick' as AnalysisDepth, label: '快速', icon: Zap, description: '基于名称' },
  { value: 'simple' as AnalysisDepth, label: '简单', icon: FileText, description: '基于描述' },
  { value: 'deep' as AnalysisDepth, label: '深度', icon: Brain, description: '深度推断' },
];

export function AIAnalysisButton({
  totalCount,
  uncategorizedCount,
  selectedCount,
  isAnalyzing,
  isPaused,
  progress,
  suggestions,
  depth,
  onDepthChange,
  onAnalyze,
  onPause,
  onResume,
  onCancel,
  onViewResults,
  disabled,
}: AIAnalysisButtonProps) {
  const [scope, setScope] = useState<AnalysisScope>('all');
  const [open, setOpen] = useState(false);

  const getAnalysisCount = () => {
    switch (scope) {
      case 'all':
        return totalCount;
      case 'uncategorized':
        return uncategorizedCount;
      case 'selected':
        return selectedCount;
    }
  };

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isActive = isAnalyzing || isPaused;

  // Determine button state/label
  const getButtonContent = () => {
    if (isActive) {
      return (
        <>
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline ml-1.5">
            {isPaused ? '已暂停' : `${progress.completed}/${progress.total}`}
          </span>
        </>
      );
    }
    
    if (suggestions.length > 0) {
      return (
        <>
          <Sparkles className="h-4 w-4" />
          <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs leading-tight">
            {suggestions.length}
          </Badge>
        </>
      );
    }

    return (
      <>
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline ml-1.5">AI</span>
        {disabled && (
          <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-xs leading-tight text-muted-foreground">
            未配置
          </Badge>
        )}
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? 'default' : suggestions.length > 0 ? 'secondary' : 'outline'}
          size="sm"
          className={cn(
            "h-9 px-3",
            isActive && "animate-pulse"
          )}
        >
          {getButtonContent()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">AI 智能分析</span>
          </div>

          {/* Progress bar when analyzing */}
          {isActive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isPaused ? '已暂停' : '分析中...'}
                </span>
                <span className="font-medium">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Scope selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              分析范围
            </label>
            <div className="flex gap-2">
              <Button
                variant={scope === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('all')}
                disabled={isActive}
                className="flex-1"
              >
                全部 ({totalCount})
              </Button>
              <Button
                variant={scope === 'uncategorized' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('uncategorized')}
                disabled={isActive}
                className="flex-1"
              >
                未分类 ({uncategorizedCount})
              </Button>
              <Button
                variant={scope === 'selected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('selected')}
                disabled={isActive || selectedCount === 0}
                className="flex-1"
              >
                选中 ({selectedCount})
              </Button>
            </div>
          </div>

          {/* Depth selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              分析深度
            </label>
            <div className="flex gap-2">
              {DEPTH_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={depth === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onDepthChange(option.value)}
                  disabled={isActive}
                  className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
                >
                  <option.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Real-time results preview */}
          {isActive && suggestions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">
                实时结果
              </label>
              <div className="text-sm bg-muted/30 rounded-lg p-2 space-y-1 max-h-20 overflow-y-auto">
                {suggestions.slice(-2).map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <span className="truncate flex-1">{s.repoName}</span>
                    <span>→</span>
                    <span className="flex gap-1">
                      {s.suggestedTags.slice(0, 2).map((tag, j) => (
                        <Badge key={j} variant="secondary" className="text-xs px-1 py-0">
                          {tag.name}
                        </Badge>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {!isActive && getAnalysisCount() > 0 && (
                <span>将分析 {getAnalysisCount()} 个仓库</span>
              )}
            </div>
            <div className="flex gap-2">
              {isActive ? (
                <>
                  {isPaused ? (
                    <Button size="sm" onClick={onResume} variant="outline" className="h-8">
                      <Play className="h-3.5 w-3.5 mr-1" />
                      继续
                    </Button>
                  ) : (
                    <Button size="sm" onClick={onPause} variant="outline" className="h-8">
                      <Pause className="h-3.5 w-3.5 mr-1" />
                      暂停
                    </Button>
                  )}
                  <Button size="sm" onClick={onCancel} variant="destructive" className="h-8">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => { onViewResults(); setOpen(false); }}
                      variant="outline"
                      className="h-8"
                    >
                      查看建议
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={() => onAnalyze(scope, depth)}
                    disabled={disabled || getAnalysisCount() === 0}
                    className="h-8"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    开始
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
