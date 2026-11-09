import React, { useState } from "react";
import { AppDependencyConflictSchema, type AppCatalogItem } from "@corely/contracts";
import {
  type ResolvedAppEntitlement,
  platformEntitlementsApi,
} from "@/lib/platform-entitlements-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@corely/ui";
import { getAppManagementPolicy } from "../apps-management-policy";

interface TenantAppsTabProps {
  tenantId: string;
  catalog: AppCatalogItem[];
  entitlements: ResolvedAppEntitlement[];
  onRefresh: () => void | Promise<void>;
}

export function TenantAppsTab({ tenantId, catalog, entitlements, onRefresh }: TenantAppsTabProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    app: AppCatalogItem;
    action: "Enable" | "Install";
  } | null>(null);
  const [disableConfirmation, setDisableConfirmation] = useState<{
    app: AppCatalogItem;
    dependents: string[];
  } | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const name = (id: string) => catalog.find((app) => app.appId === id)?.name ?? id;

  const toggle = async (app: AppCatalogItem, enabled: boolean, cascade = false) => {
    if (pending) {
      return;
    }
    setPending(app.appId);
    setError("");
    setFeedback("");
    try {
      // The existing host API resolves dependencies, validates constraints and audits.
      // A conflict never silently becomes a cascading disable.
      if (cascade) {
        await platformEntitlementsApi.updateAppEnablement(tenantId, app.appId, enabled, true);
      } else {
        await platformEntitlementsApi.updateAppEnablement(tenantId, app.appId, enabled);
      }
      const outcome = enabled ? (app.enabled ? "enabled" : "installed and enabled") : "disabled";
      setFeedback(`${app.name} ${outcome}. The change was recorded in the audit log.`);
      await onRefresh();
    } catch (cause: unknown) {
      const status =
        typeof cause === "object" && cause !== null && "status" in cause ? cause.status : undefined;
      const conflict = AppDependencyConflictSchema.safeParse(
        typeof cause === "object" && cause !== null && "body" in cause ? cause.body : undefined
      );
      if (!enabled && status === 409 && conflict.success && conflict.data.dependents.length) {
        setDisableConfirmation({ app, dependents: conflict.data.dependents });
      }
      setError(
        status === 409
          ? `Cannot disable ${app.name} while dependent apps are enabled. Disable those apps first, then try again.`
          : status === 403
            ? "You no longer have permission to manage team apps. No change was applied."
            : `Could not update ${app.name}. Refresh the configuration before trying again.`
      );
      await onRefresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enable the apps your team needs. Access also depends on each workspace and user’s
        permissions.
      </p>
      {error && (
        <p role="alert" className="rounded-md border border-destructive p-4">
          {error}
        </p>
      )}
      {feedback && (
        <p role="status" className="rounded-md border p-4">
          {feedback}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalog.map((app) => {
          const entitlement = entitlements.find((entry) => entry.appId === app.appId);
          const enabled = entitlement?.enabled ?? false;
          const activeInstall = app.enabled === true;
          const configured = enabled && activeInstall;
          const action = configured ? "Disable" : enabled ? "Install" : "Enable";
          const policy = getAppManagementPolicy(app.appId);
          return (
            <Card key={app.appId}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="min-w-0 break-words text-lg">{app.name}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {activeInstall ? "Active installation" : "No active installation"}
                    </Badge>
                    <Badge variant={enabled ? "default" : "outline"}>
                      {enabled ? "Team enabled" : "Team disabled"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>v{app.version}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.description && (
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                )}
                {app.dependencies.length > 0 && (
                  <p className="text-sm">Requires: {app.dependencies.map(name).join(", ")}</p>
                )}
                {configured && policy.hideDisableAction ? (
                  <p className="text-sm text-muted-foreground">{policy.reason}</p>
                ) : (
                  <Button
                    className="min-h-11 w-full"
                    variant={configured ? "outline" : "default"}
                    disabled={pending !== null}
                    aria-label={`${action}: ${app.name}`}
                    onClick={() => {
                      if (!configured && app.dependencies.length) {
                        setConfirmation({
                          app,
                          action: action === "Install" ? "Install" : "Enable",
                        });
                      } else {
                        void toggle(app, !configured);
                      }
                    }}
                  >
                    {pending === app.appId ? "Saving…" : `${action} app`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation?.action} {confirmation?.app.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This also enables required apps: {confirmation?.app.dependencies.map(name).join(", ")}
              . Required apps and their dependencies will be enabled for this team. User permissions
              remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const app = confirmation?.app;
                setConfirmation(null);
                if (app) {
                  void toggle(app, true);
                }
              }}
            >
              {confirmation?.action} with dependencies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={disableConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDisableConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disable {disableConfirmation?.app.name} and dependent apps?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Also disables: {disableConfirmation?.dependents.map(name).join(", ")}. All current
              dependencies are checked again when you confirm. Business records are retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending !== null}
              onClick={() => {
                const change = disableConfirmation;
                setDisableConfirmation(null);
                if (change) {
                  void toggle(change.app, false, true);
                }
              }}
            >
              Disable app and dependents
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
