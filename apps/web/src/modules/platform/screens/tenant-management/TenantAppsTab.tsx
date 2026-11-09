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
  const [confirmation, setConfirmation] = useState<AppCatalogItem | null>(null);
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
      setFeedback(
        `${app.name} ${enabled ? "enabled" : "disabled"}. The change was recorded in the audit log.`
      );
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
          const policy = getAppManagementPolicy(app.appId);
          return (
            <Card key={app.appId}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="min-w-0 break-words text-lg">{app.name}</CardTitle>
                  <Badge variant={enabled ? "default" : "outline"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Badge>
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
                {enabled && policy.hideDisableAction ? (
                  <p className="text-sm text-muted-foreground">{policy.reason}</p>
                ) : (
                  <Button
                    className="min-h-11 w-full"
                    variant={enabled ? "outline" : "default"}
                    disabled={pending !== null}
                    aria-label={`${enabled ? "Disable" : "Enable"}: ${app.name}`}
                    onClick={() => {
                      if (!enabled && app.dependencies.length) {
                        setConfirmation(app);
                      } else {
                        void toggle(app, !enabled);
                      }
                    }}
                  >
                    {pending === app.appId ? "Saving…" : enabled ? "Disable app" : "Enable app"}
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
            <AlertDialogTitle>Enable {confirmation?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This also enables required apps: {confirmation?.dependencies.map(name).join(", ")}.
              Required apps and their dependencies will be enabled for this team. User permissions
              remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const app = confirmation;
                setConfirmation(null);
                if (app) {
                  void toggle(app, true);
                }
              }}
            >
              Enable with dependencies
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
