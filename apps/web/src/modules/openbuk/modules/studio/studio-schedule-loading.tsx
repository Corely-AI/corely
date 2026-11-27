import { LoadingSkeleton, Skeleton } from "@corely/ui";
import { useLanguage } from "../../shared/i18n";

export function StudioScheduleLoading({ fullView = false }: { fullView?: boolean }) {
  const { t } = useLanguage();
  return (
    <LoadingSkeleton label={t("loading")} className="studio-schedule-skeleton">
      {fullView && (
        <>
          <div className="page-heading">
            <Skeleton className="studio-skeleton-title" />
            <Skeleton className="studio-skeleton-date" />
          </div>
          <Skeleton className="studio-skeleton-public" />
        </>
      )}
      {[0, 1, 2].map((row) => (
        <Skeleton className="studio-skeleton-row" key={row} />
      ))}
    </LoadingSkeleton>
  );
}
