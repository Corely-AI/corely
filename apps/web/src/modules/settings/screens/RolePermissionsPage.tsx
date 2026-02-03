import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { RolePermissionsEditor } from "../components/RolePermissionsEditor";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  useUpdateRolePermissions,
  useSyncOwnerPermissions,
} from "../hooks/useUpdateRolePermissions";
import type { RolePermissionGrant } from "@corely/contracts";
import { useRoles } from "../hooks/useRoles";
import { useActiveRoleId } from "@/shared/lib/permissions";

export default function RolePermissionsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { data, isLoading } = useRolePermissions(roleId);
  const updatePermissions = useUpdateRolePermissions(roleId || "");
  const syncOwnerPermissions = useSyncOwnerPermissions(roleId || "");
  const { data: roles = [] } = useRoles();
  const { roleId: activeRoleId } = useActiveRoleId();

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [initialKeys, setInitialKeys] = useState<Set<string>>(new Set());

  const role = data?.role;
  const currentRole = roles.find((entry) => entry.id === activeRoleId);
  const isCurrentUserOwner =
    currentRole?.systemKey === "OWNER" || currentRole?.name.toLowerCase() === "owner";
  const isOwnerRole = role?.systemKey === "OWNER" || role?.name.toLowerCase() === "owner";

  const catalogKeys = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.catalog.flatMap((group) => group.permissions.map((permission) => permission.key));
  }, [data]);

  const grantedKeys = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.grants.filter((grant) => grant.granted).map((grant) => grant.key);
  }, [data]);

  const ownerMissingCount = useMemo(() => {
    if (!isOwnerRole || !catalogKeys.length) {
      return 0;
    }
    const grantedSet = new Set(grantedKeys);
    return catalogKeys.reduce((count, key) => (grantedSet.has(key) ? count : count + 1), 0);
  }, [catalogKeys, grantedKeys, isOwnerRole]);

  useEffect(() => {
    if (!data) {
      return;
    }
    const grantedSet = new Set(grantedKeys);
    setInitialKeys(new Set(grantedKeys));
    if (isOwnerRole) {
      setSelectedKeys(new Set(catalogKeys));
    } else {
      setSelectedKeys(grantedSet);
    }
  }, [catalogKeys, data, grantedKeys, isOwnerRole]);

  const dirty = useMemo(() => {
    if (selectedKeys.size !== initialKeys.size) {
      return true;
    }
    for (const key of selectedKeys) {
      if (!initialKeys.has(key)) {
        return true;
      }
    }
    return false;
  }, [initialKeys, selectedKeys]);

  const readOnly = isOwnerRole || ((role?.isSystem ?? false) && !isCurrentUserOwner);

  const handleSave = async () => {
    if (!roleId) {
      return;
    }
    const grants: RolePermissionGrant[] = Array.from(selectedKeys).map((key) => ({
      key,
      effect: "ALLOW",
    }));
    await updatePermissions.mutateAsync({ grants });
  };

  const handleSyncOwnerPermissions = async () => {
    if (!roleId) {
      return;
    }
    await syncOwnerPermissions.mutateAsync();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings/roles">Back</Link>
            </Button>
            <h1 className="text-h2 text-foreground">Role permissions</h1>
          </div>
          {role && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{role.name}</span>
              {role.isSystem && <Badge variant="outline">System</Badge>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwnerRole && (
            <Button
              variant="outline"
              onClick={handleSyncOwnerPermissions}
              disabled={syncOwnerPermissions.isPending || ownerMissingCount === 0}
            >
              Sync owner permissions
            </Button>
          )}
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={!dirty || readOnly || updatePermissions.isPending}
          >
            Save changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="text-sm text-muted-foreground">Loading permissions...</div>
          ) : (
            <RolePermissionsEditor
              catalog={data.catalog}
              selectedKeys={selectedKeys}
              onChange={setSelectedKeys}
              readOnly={readOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
