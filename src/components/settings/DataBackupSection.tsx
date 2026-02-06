import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataExport, useDataImport } from "@/hooks/useDataBackup";
import type { ImportMode } from "@/types/backup";

export function DataBackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(
    null,
  );

  const { exportData, isExporting, getPreview } = useDataExport();
  const { importData, isImporting, result, clearResult } = useDataImport();

  const preview = getPreview();

  const openFilePicker = () => {
    clearResult();
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];

    // 清空文件选择：允许重复选择同一文件
    e.target.value = "";

    if (!file) return;

    if (importMode === "replace") {
      setPendingReplaceFile(file);
      setReplaceDialogOpen(true);
      return;
    }

    await importData(file, "merge");
  };

  const handleConfirmReplace = async () => {
    if (!pendingReplaceFile) return;
    try {
      await importData(pendingReplaceFile, "replace");
    } finally {
      setReplaceDialogOpen(false);
      setPendingReplaceFile(null);
    }
  };

  const handleCancelReplace = () => {
    setReplaceDialogOpen(false);
    setPendingReplaceFile(null);
  };

  return (
    <Card id="backup" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>数据备份</CardTitle>
        <CardDescription>
          导出或导入本地标签、备注与 Release 订阅数据（不包含 GitHub
          Token、缓存等敏感/可重建信息）
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 导出 */}
        <section className="space-y-3">
          <h4 className="font-medium text-sm">导出数据</h4>
          <p className="text-sm text-muted-foreground">
            将导出 {preview.tagsCount} 个标签、{preview.repoMetaCount}{" "}
            个仓库备注、
            {preview.subscriptionsCount} 个 Release 订阅
          </p>
          <Button onClick={exportData} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "导出中..." : "导出为 JSON"}
          </Button>
        </section>

        <div className="border-t" />

        {/* 导入 */}
        <section className="space-y-3">
          <h4 className="font-medium text-sm">导入数据</h4>

          <RadioGroup
            value={importMode}
            onValueChange={(v) => {
              clearResult();
              setImportMode(v as ImportMode);
            }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="merge" id="backup-merge" />
              <Label htmlFor="backup-merge">合并（保留现有数据）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="replace" id="backup-replace" />
              <Label htmlFor="backup-replace">替换（覆盖现有数据）</Label>
            </div>
          </RadioGroup>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={openFilePicker}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? "导入中..." : "选择文件导入"}
          </Button>

          {result ? (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <div>
                <AlertTitle>
                  {result.success ? "导入完成" : "导入失败"}
                </AlertTitle>
                <AlertDescription>
                  {result.success ? (
                    <>
                      <p>
                        已导入标签 {result.imported.tags} 个、仓库备注{" "}
                        {result.imported.repoMeta} 个、订阅{" "}
                        {result.imported.subscriptions} 个。
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          为确保数据完全生效，请点击“刷新页面”按钮。
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.reload()}
                        >
                          刷新页面
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p>{result.errors.join("；")}</p>
                  )}

                  {result.warnings.length ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      警告：{result.warnings.join("；")}
                    </p>
                  ) : null}
                </AlertDescription>
              </div>
            </Alert>
          ) : null}
        </section>
      </CardContent>

      {/* Replace mode confirm */}
      <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认覆盖本地数据？</AlertDialogTitle>
            <AlertDialogDescription>
              替换模式会覆盖现有的标签、备注与 Release 订阅数据。AI 配置中的 API
              Key 不会被覆盖。建议导入后点击“刷新页面”按钮以确保全部状态生效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isImporting}
              onClick={handleCancelReplace}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isImporting}
              onClick={handleConfirmReplace}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              确认覆盖并导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
