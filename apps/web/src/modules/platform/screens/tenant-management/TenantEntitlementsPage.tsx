import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { TenantAppsTab } from "./TenantAppsTab";
import { TenantFeaturesTab } from "./TenantFeaturesTab";
import { TenantUsersTab } from "./TenantUsersTab";
import {
  platformEntitlementsApi,
  type TenantEntitlementsResponse,
} from "@/lib/platform-entitlements-api";
import { Loader2 } from "lucide-react";

export function TenantEntitlementsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [entitlements, setEntitlements] = useState<TenantEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    if (!tenantId) {
      return;
    }
    setLoading(true);
    try {
      const entData = await platformEntitlementsApi.getEntitlements(tenantId);
      setEntitlements(entData);
    } catch (err) {
      console.error("Failed to load entitlements", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!entitlements || !tenantId) {
    return <div>Tenant not found or error loading</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Tenant Entitlements</h1>

      <Tabs defaultValue="apps">
        <TabsList>
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="pt-4">
          <TenantAppsTab tenantId={tenantId} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="features" className="pt-4">
          <TenantFeaturesTab
            tenantId={tenantId}
            features={entitlements.features}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="users" className="pt-4">
          <TenantUsersTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
