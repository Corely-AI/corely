import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TenantAppsTab } from "./TenantAppsTab";
import { TenantFeaturesTab } from "./TenantFeaturesTab";
import {
  platformEntitlementsApi,
  type TenantEntitlementsResponse,
} from "@/lib/platform-entitlements-api";
import { apiClient } from "@/lib/api-client";
import { type AppCatalogItem } from "@corely/contracts";
import { Loader2 } from "lucide-react";

export function TenantEntitlementsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [entitlements, setEntitlements] = useState<TenantEntitlementsResponse | null>(null);
  const [catalog, setCatalog] = useState<AppCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!tenantId) {
      return;
    }
    setLoading(true);
    try {
      const [entData, catData] = await Promise.all([
        platformEntitlementsApi.getEntitlements(tenantId),
        apiClient.get<AppCatalogItem[]>("/platform/apps"),
      ]);
      setEntitlements(entData);
      setCatalog(catData);
    } catch (err) {
      console.error("Failed to load entitlements", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [tenantId]);

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
        </TabsList>

        <TabsContent value="apps" className="pt-4">
          <TenantAppsTab
            tenantId={tenantId}
            catalog={catalog}
            entitlements={entitlements.apps}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="features" className="pt-4">
          <TenantFeaturesTab
            tenantId={tenantId}
            features={entitlements.features}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
