import { LoadingSkeleton, Skeleton } from "@corely/ui";
import { useTranslation } from "react-i18next";

export function RequestDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <LoadingSkeleton label={t("sign.loadingRequest")} className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-4">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-40 max-w-full" />
        <div className="space-y-2 rounded border p-4">
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-5 w-52 max-w-full" />
        </div>
        <div className="grid max-w-4xl gap-4 rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="h-7 w-40 max-w-full" />
          <Skeleton className="h-10 w-44 max-w-full" />
          <RequestProgressPlaceholder />
          <Skeleton className="h-10 w-24 max-w-full" />
        </div>
      </div>
    </LoadingSkeleton>
  );
}

export function RequestProgressSkeleton() {
  const { t } = useTranslation();
  return (
    <LoadingSkeleton label={t("sign.loadingRequest")}>
      <RequestProgressPlaceholder />
    </LoadingSkeleton>
  );
}

function RequestProgressPlaceholder() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-56 max-w-full" />
      <Skeleton className="h-4 w-40 max-w-full" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}
