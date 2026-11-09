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
import { catalogLaunchUrl } from "./focused-shell-navigation";
import { focusedShellCopy, type FocusedShellLocale } from "./focused-shell-copy";

export interface AppSwitcherProps {
  app: AppLaunchId;
  workspaceId: string;
  apps: AppCatalogItem[];
  locale?: FocusedShellLocale;
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  onLaunch: (app: AppLaunchId) => void;
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
  const destinations = apps.filter((item) => item.launch && item.launch.launchId !== app);
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
            const launch = item.launch;
            if (!launch) {
              return null;
            }
            const enabled = Boolean(catalogLaunchUrl(item, workspaceId));
            const reason =
              launch.availability === "coming-soon"
                ? copy.comingSoon
                : launch.availability === "unconfigured"
                  ? copy.unconfigured
                  : launch.availability === "app-disabled"
                    ? copy.disabled
                    : copy.unavailable;
            return (
              <DropdownMenuItem
                key={launch.launchId}
                disabled={!enabled}
                onSelect={() => onLaunch(launch.launchId)}
                className="min-h-11 flex-col items-start gap-1"
              >
                <span>{launch.displayName[locale]}</span>
                {!enabled && <span className="text-xs">{reason}</span>}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
