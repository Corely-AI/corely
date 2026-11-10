import React from "react";
import { Grid2X2 } from "lucide-react";
import type { AppCatalogItem, AppLaunchId } from "@corely/contracts";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@corely/ui";
import { catalogEntryUrl, catalogMetadata } from "./app-directory-navigation";
import { AppLogo } from "./app-logo";
import { focusedShellCopy, type FocusedShellLocale } from "./focused-shell-copy";

export interface AppSwitcherProps {
  app: AppLaunchId;
  workspaceId: string;
  apps: AppCatalogItem[];
  locale?: FocusedShellLocale;
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  onLaunch: (app: string) => void;
}

export function AppSwitcher({
  app,
  workspaceId,
  apps,
  locale = "en",
  loading,
  error,
  onRetry,
  onLaunch,
}: AppSwitcherProps) {
  const copy = focusedShellCopy[locale];
  const destinations = apps.filter(
    (item) => catalogMetadata(item) && item.launch?.launchId !== app
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={copy.switchApps}>
          <Grid2X2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
        {loading ? (
          <div role="status" className="p-3 text-sm">
            {copy.loading}
          </div>
        ) : error ? (
          <div className="p-3 text-sm" role="alert">
            <p>{copy.error}</p>
            <Button variant="ghost" onClick={onRetry}>
              {copy.retry}
            </Button>
          </div>
        ) : destinations.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{copy.noApps}</p>
        ) : (
          destinations.map((item) => {
            const launch = catalogMetadata(item);
            if (!launch) {
              return null;
            }
            const enabled = Boolean(catalogEntryUrl(item, workspaceId));
            const reason =
              !item.directory && item.launch?.availability === "coming-soon"
                ? copy.comingSoon
                : item.launch?.availability === "unconfigured"
                  ? copy.unconfigured
                  : !item.enabled || item.launch?.availability === "app-disabled"
                    ? copy.disabled
                    : copy.unavailable;
            return (
              <DropdownMenuItem
                key={item.appId}
                disabled={!enabled}
                onSelect={() => onLaunch(item.appId)}
                className="min-h-11 gap-3"
              >
                <AppLogo logo={item.directory?.logo} iconKey={item.launch?.iconKey} compact />
                <span className="flex flex-col items-start">
                  <span>{launch.displayName[locale]}</span>
                  {!enabled && <span className="text-xs">{reason}</span>}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
