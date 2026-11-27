import { LoadingSkeleton, Skeleton } from "@corely/ui";
import "./standalone-loading.css";

export function StandaloneLoading({
  label,
  variant = "form",
}: {
  label: string;
  variant?: "form" | "calendar";
}) {
  return (
    <LoadingSkeleton label={label} className="standalone-loading">
      {variant === "calendar" ? (
        <div className="standalone-loading-calendar">
          {Array.from({ length: 14 }, (_, day) => (
            <Skeleton key={day} className="standalone-loading-cell" />
          ))}
        </div>
      ) : (
        <div className="standalone-loading-form">
          <Skeleton className="standalone-loading-label" />
          <Skeleton className="standalone-loading-control" />
          <Skeleton className="standalone-loading-control" />
        </div>
      )}
    </LoadingSkeleton>
  );
}
