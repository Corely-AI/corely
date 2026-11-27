import { LoadingSkeleton } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";

export function PageLoadingSkeleton({
  variant = "detail",
  className,
}: {
  variant?: NonNullable<React.ComponentProps<typeof LoadingSkeleton>["variant"]>;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <LoadingSkeleton
      label={t("common.loading", "Loading…")}
      variant={variant}
      withHeading
      className={cn("p-6 lg:p-8", className)}
    />
  );
}
