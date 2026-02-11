import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Alert, AlertDescription } from "@corely/ui";
import { Loader2, Lock } from "lucide-react";
import { platformEntitlementsApi } from "@/lib/platform-entitlements-api";
import type { EffectiveAppState } from "@corely/contracts";
import { hasPermission, useEffectivePermissions } from "@/shared/lib/permissions";

export function TenantAppsSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [savingAppId, setSavingAppId] = React.useState<string | null>(null);
  const [apps, setApps] = React.useState<EffectiveAppState[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const { data: permissionsData } = useEffectivePermissions();
  const canManage = hasPermission(permissionsData?.permissions, "tenant.apps.manage");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformEntitlementsApi.getCurrentTenantEffectiveApps();
      setApps(response.apps);
    } catch {
      setError("Failed to load apps");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (app: EffectiveAppState) => {
    const nextEnabled = !app.tenantSetting.enabled;
    setSavingAppId(app.appId);
    try {
      await platformEntitlementsApi.updateCurrentTenantAppSetting(app.appId, {
        enabled: nextEnabled,
      });
      await load();
    } catch {
      setError("Failed to update app setting");
    } finally {
      setSavingAppId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl">
      <div>
        <h1 className="text-h1 text-foreground">Apps</h1>
        <p className="text-muted-foreground mt-2">
          Enable or disable apps for your tenant based on host policy and plan entitlements.
        </p>
      </div>

      {!canManage && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You can view app status, but you do not have permission to change app settings.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const blockers = app.blockers.length > 0 ? app.blockers.join(", ") : null;
          const canEdit = canManage && app.tenantSetting.isEditable;
          return (
            <Card key={app.appId} className={app.effective.visible ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription className="mt-1">{app.appId}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {app.isSystem && <Badge variant="secondary">System</Badge>}
                    <Badge variant={app.effective.visible ? "default" : "outline"}>
                      {app.effective.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Plan:{" "}
                  <span className="font-medium">
                    {app.planEntitlement.enabled ? "Entitled" : "Not entitled"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Host policy:{" "}
                  <span className="font-medium">
                    {app.hostPolicy.allowed ? "Allowed" : "Denied"} / forced {app.hostPolicy.forced}
                  </span>
                </div>
                {blockers && (
                  <div className="text-xs text-muted-foreground">Blockers: {blockers}</div>
                )}

                {canEdit ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggle(app)}
                    disabled={savingAppId !== null}
                  >
                    {savingAppId === app.appId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : app.tenantSetting.enabled ? (
                      "Disable"
                    ) : (
                      "Enable"
                    )}
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2 border rounded-md">
                    {app.tenantSetting.isEditable
                      ? "No permission to change this app."
                      : "This app is locked by system/host policy or entitlement."}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
