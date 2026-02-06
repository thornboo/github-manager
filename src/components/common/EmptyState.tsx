import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="text-center text-muted-foreground space-y-1">
        <p className="text-lg text-foreground">{title}</p>
        {description ? <p className="text-sm">{description}</p> : null}
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}
