import { useCallback, useState } from "react";
import {
  collectBackupData,
  exportBackup,
  importFromFile,
} from "@/lib/backup-manager";
import type { ImportMode, ImportResult } from "@/types/backup";

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(() => {
    setIsExporting(true);
    try {
      exportBackup();
    } finally {
      setIsExporting(false);
    }
  }, []);

  const getPreview = useCallback(() => {
    const backupData = collectBackupData();
    return {
      tagsCount: backupData.tags.length,
      repoMetaCount: Object.keys(backupData.repoMeta).length,
      subscriptionsCount: backupData.releaseSubscriptions.length,
    };
  }, []);

  return { exportData, isExporting, getPreview };
}

export function useDataImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importData = useCallback(async (file: File, mode: ImportMode) => {
    setIsImporting(true);
    setResult(null);
    try {
      const res = await importFromFile(file, mode);
      setResult(res);
      return res;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { importData, isImporting, result, clearResult };
}
