import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { TenantAppsTab } from "./TenantAppsTab";
import { TenantFeaturesTab } from "./TenantFeaturesTab";
import { TenantUsersTab } from "./TenantUsersTab";
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
  const [loadError, setLoadError] = useState(false);
  const [loadedTenantId, setLoadedTenantId] = useState<string>();
  const requestId = useRef(0);
  const activeTenantId = useRef(tenantId);
  useLayoutEffect(() => {
    activeTenantId.current = tenantId;
    return () => {
      activeTenantId.current = undefined;
    };
  }, [tenantId]);

  const loadData = useCallback(async () => {
    if (!tenantId || activeTenantId.current !== tenantId) {
      return;
    }
    setLoadError(false);
    const current = ++requestId.current;
    try {
      const [entData, catData] = await Promise.all([
        platformEntitlementsApi.getEntitlements(tenantId),
        apiClient.get<AppCatalogItem[]>(
          `/platform/apps?forTenantId=${encodeURIComponent(tenantId)}`
        ),
      ]);
      if (requestId.current !== current || activeTenantId.current !== tenantId) {
        return;
      }
      setEntitlements(entData);
      setCatalog(catData);
      setLoadedTenantId(tenantId);
    } catch (err) {
      if (requestId.current !== current || activeTenantId.current !== tenantId) {
        return;
      }
      setLoadError(true);
      console.error("Failed to load entitlements", err);
    } finally {
      if (requestId.current === current && activeTenantId.current === tenantId) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
    return () => {
      requestId.current++;
    };
  }, [loadData]);

  if (loading || (loadedTenantId !== tenantId && !loadError)) {
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
      {loadError && (
        <p role="alert">
          Configuration could not be refreshed. Reload before making another change.
        </p>
      )}

      {!loadError && (
        <Tabs keepMounted defaultValue="apps">
          <TabsList>
            <TabsTrigger value="apps">Apps</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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

          <TabsContent value="users" className="pt-4">
            <TenantUsersTab tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
