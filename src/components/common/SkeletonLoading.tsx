import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SkeletonLoadingVariant = "list" | "repo-grid" | "dashboard";

interface SkeletonLoadingProps {
  variant?: SkeletonLoadingVariant;
  count?: number;
  className?: string;
}

function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

function RepoGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-10 w-full lg:max-w-sm" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>

      <Skeleton className="h-[260px] w-full rounded-xl" />

      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonLoading({
  variant = "list",
  count,
  className,
}: SkeletonLoadingProps) {
  return (
    <div className={cn("w-full", className)}>
      {variant === "list" ? <ListSkeleton count={count} /> : null}
      {variant === "repo-grid" ? <RepoGridSkeleton count={count} /> : null}
      {variant === "dashboard" ? <DashboardSkeleton /> : null}
    </div>
  );
}
