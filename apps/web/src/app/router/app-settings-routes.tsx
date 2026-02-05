import React from "react";
import { Navigate, Route } from "react-router-dom";
import { SettingsPage, RolesPage, RolePermissionsPage } from "../../modules/settings";
import { RequirePermission } from "../../modules/settings/components/RequirePermission";
import { PaymentMethodsSettings } from "../../modules/settings/payment-methods";
import {
  PlatformPage,
  AppsManagementPage,
  TemplatesPage,
  MenuCustomizerPage,
} from "../../modules/platform";
import { TenantsListPage } from "../../modules/platform/screens/tenant-management/TenantsListPage";
import CreateTenantPage from "../../modules/platform/screens/tenant-management/CreateTenantPage";
import { TenantEntitlementsPage } from "../../modules/platform/screens/tenant-management/TenantEntitlementsPage";
import { TaxSettingsPage } from "../../modules/tax";
import { RequireCapability } from "../../shared/workspaces/RequireCapability";
import { WorkspaceMembersPage, WorkspaceSettingsPage } from "../../modules/workspaces";

export const appSettingsRoutes = (
  <>
    {/* Legacy Redirects */}
    <Route path="/taxes" element={<Navigate to="/tax" replace />} />
    <Route path="/tax/reports" element={<Navigate to="/tax/filings" replace />} />
    <Route path="/tax/period/:key" element={<Navigate to="/tax/filings/:key" replace />} />
    <Route path="/settings/tax" element={<Navigate to="/tax/settings" replace />} />

    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/settings/payment-methods" element={<PaymentMethodsSettings />} />
    <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
    <Route
      path="/settings/members"
      element={
        <RequireCapability capability="workspace.multiUser">
          <WorkspaceMembersPage />
        </RequireCapability>
      }
    />
    <Route path="/settings/tax" element={<TaxSettingsPage />} />
    <Route
      path="/settings/roles"
      element={
        <RequireCapability capability="workspace.rbac">
          <RequirePermission permission="settings.roles.manage">
            <RolesPage />
          </RequirePermission>
        </RequireCapability>
      }
    />
    <Route
      path="/settings/roles/:roleId/permissions"
      element={
        <RequireCapability capability="workspace.rbac">
          <RequirePermission permission="settings.roles.manage">
            <RolePermissionsPage />
          </RequirePermission>
        </RequireCapability>
      }
    />
    <Route
      path="/settings/platform"
      element={
        <RequirePermission permission="platform.apps.manage">
          <PlatformPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/platform/apps"
      element={
        <RequirePermission permission="platform.apps.manage">
          <AppsManagementPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/platform/templates"
      element={
        <RequirePermission permission="platform.templates.apply">
          <TemplatesPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/platform/menu"
      element={
        <RequirePermission permission="platform.menu.customize">
          <MenuCustomizerPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/tenants"
      element={
        <RequirePermission permission="platform.tenants.read">
          <TenantsListPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/tenants/new"
      element={
        <RequirePermission permission="platform.tenants.write">
          <CreateTenantPage />
        </RequirePermission>
      }
    />
    <Route
      path="/settings/tenants/:tenantId"
      element={
        <RequirePermission permission="platform.tenants.write">
          <TenantEntitlementsPage />
        </RequirePermission>
      }
    />
  </>
);
