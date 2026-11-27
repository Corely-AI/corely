import { Skeleton } from "./skeleton";
import { cn } from "./lib/utils";

type SkeletonVariant = "list" | "detail" | "form" | "cards" | "calendar" | "thread";

type LoadingSkeletonProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  label: string;
  withHeading?: boolean;
} & (
    | { variant: SkeletonVariant; children?: never }
    | { variant?: never; children: React.ReactNode }
  );

function PlaceholderContent({ variant }: { variant: SkeletonVariant }) {
  switch (variant) {
    case "list":
      return (
        <div className="divide-y rounded-lg border bg-card">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="ml-auto h-4 w-1/2" />
            </div>
          ))}
        </div>
      );
    case "detail":
      return (
        <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    case "form":
      return (
        <div className="grid gap-5 rounded-lg border bg-card p-4 sm:grid-cols-2 sm:p-6">
          {[0, 1, 2, 3].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-4 w-24 max-w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="space-y-4 rounded-lg border bg-card p-4">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      );
    case "calendar":
      return (
        <div className="grid grid-cols-7 gap-1 rounded-lg border bg-card p-2 sm:gap-2 sm:p-4">
          {Array.from({ length: 21 }, (_, day) => (
            <Skeleton key={day} className="h-9 sm:h-14" />
          ))}
        </div>
      );
    case "thread":
      return (
        <div className="space-y-4 py-2">
          <Skeleton className="h-10 w-3/4 max-w-sm rounded-xl" />
          <Skeleton className="ml-auto h-10 w-2/3 max-w-xs rounded-xl" />
          <Skeleton className="h-16 w-4/5 max-w-md rounded-xl" />
        </div>
      );
  }
}

export function LoadingSkeleton({
  label,
  variant,
  withHeading = false,
  className,
  children,
  ...props
}: LoadingSkeletonProps) {
  return (
    <div className={className} {...props}>
      <span role="status" className="sr-only">
        {label}
      </span>
      <div aria-hidden="true" className={cn(withHeading && "space-y-5")}>
        {withHeading && <Skeleton className="h-8 w-48 max-w-full" />}
        {variant ? <PlaceholderContent variant={variant} /> : children}
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({ columns, label }: { columns: number; label: string }) {
  return (
    <>
      <tr>
        <td colSpan={columns} className="h-0 p-0">
          <span role="status" className="sr-only">
            {label}
          </span>
        </td>
      </tr>
      {[0, 1, 2, 3].map((row) => (
        <tr key={row} aria-hidden="true" className="border-b last:border-b-0">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-4 py-4">
              <Skeleton className={column === 0 ? "h-4 w-4/5" : "h-4 w-3/5"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
