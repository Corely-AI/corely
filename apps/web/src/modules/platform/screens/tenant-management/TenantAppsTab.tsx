import React from "react";
import type { EffectiveAppState } from "@corely/contracts";
import { platformEntitlementsApi } from "@/lib/platform-entitlements-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";

interface TenantAppsTabProps {
  tenantId: string;
  onRefresh: () => void;
}

export function TenantAppsTab({ tenantId, onRefresh }: TenantAppsTabProps) {
  const [apps, setApps] = React.useState<EffectiveAppState[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingAppId, setSavingAppId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformEntitlementsApi.getEffectiveApps(tenantId);
      setApps(response.apps);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updatePolicy = async (
    app: EffectiveAppState,
    input: { allowed?: boolean; forced?: "none" | "on" | "off" }
  ) => {
    setSavingAppId(app.appId);
    try {
      await platformEntitlementsApi.updateAppPolicy(tenantId, app.appId, input);
      await load();
      onRefresh();
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const locked = app.isSystem;
          const blockers = app.blockers.length > 0 ? app.blockers.join(", ") : null;
          return (
            <Card key={app.appId} className={app.effective.visible ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription className="mt-1">{app.appId}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {app.isSystem && <Badge variant="secondary">System</Badge>}
                    <Badge variant={app.effective.visible ? "default" : "outline"}>
                      {app.effective.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Plan entitlement:{" "}
                  <span className="font-medium">
                    {app.planEntitlement.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Tenant setting:{" "}
                  <span className="font-medium">
                    {app.tenantSetting.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                {blockers && (
                  <div className="text-xs text-muted-foreground">Blockers: {blockers}</div>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Host allow</span>
                    <Button
                      size="sm"
                      variant={app.hostPolicy.allowed ? "outline" : "default"}
                      disabled={locked || savingAppId !== null}
                      onClick={() => updatePolicy(app, { allowed: !app.hostPolicy.allowed })}
                    >
                      {savingAppId === app.appId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : app.hostPolicy.allowed ? (
                        "Allow"
                      ) : (
                        "Deny"
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Host force</span>
                    <Select
                      value={app.hostPolicy.forced}
                      onValueChange={(value: "none" | "on" | "off") =>
                        void updatePolicy(app, { forced: value })
                      }
                      disabled={locked || savingAppId !== null}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="on">Force on</SelectItem>
                        <SelectItem value="off">Force off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
