import React from "react";
import type { AppCatalogItem, AppLaunchId } from "@corely/contracts";
import { getIconByName } from "../shared/utils/iconMapping";

type LogoMetadata = NonNullable<AppCatalogItem["directory"]>["logo"];
const tones = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent text-accent-foreground",
  muted: "bg-muted text-foreground",
};

export function FocusedAppIdentity({
  app,
  apps,
  label,
}: {
  app: AppLaunchId;
  apps: AppCatalogItem[];
  label: string;
}) {
  const logo = apps.find((entry) => entry.launch?.launchId === app)?.directory?.logo;
  return (
    <>
      <AppLogo logo={logo} iconKey={app === "invoice" ? "FileText" : "Users"} compact />
      <span className="text-lg font-semibold">{label}</span>
    </>
  );
}
/** Decorative mark; the adjacent app name provides the accessible label. */
export function AppLogo({
  logo,
  iconKey = "Package",
  compact = false,
}: {
  logo?: LogoMetadata;
  iconKey?: string;
  compact?: boolean;
}) {
  const Icon = getIconByName(logo?.iconKey ?? iconKey);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${compact ? "h-8 w-8" : "h-11 w-11"} ${tones[logo?.tone ?? "primary"]}`}
    >
      <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.75} />
    </span>
  );
}
