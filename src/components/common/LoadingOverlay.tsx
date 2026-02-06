import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  label?: string;
  className?: string;
}

export function LoadingOverlay({
  label = "正在加载...",
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
