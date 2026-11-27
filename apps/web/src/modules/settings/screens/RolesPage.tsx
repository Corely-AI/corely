import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TableLoadingSkeleton, Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from "../hooks/useRoles";
import type { RoleDto } from "@corely/contracts";

export default function RolesPage() {
  const uiCopy = useUiCopy("ui.settings-rolespage");
  const { data: roles = [], isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDto | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{uiCopy("roles")}</h1>
          <p className="text-sm text-muted-foreground">{uiCopy("create-roles-and-manage")}</p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          {uiCopy("new-role")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("role-list")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("name")}</TableHead>
                <TableHead>{uiCopy("description")}</TableHead>
                <TableHead>{uiCopy("status")}</TableHead>
                <TableHead className="text-right">{uiCopy("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingSkeleton columns={4} label={uiCopy("loading-roles")} />
              ) : sortedRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {uiCopy("no-roles-yet")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="outline">{uiCopy("system")}</Badge>
                      ) : (
                        <Badge variant="accent">{uiCopy("custom")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setEditRole(role)}>
                        {uiCopy("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/settings/roles/${role.id}/permissions`}>
                          {uiCopy("permissions")}
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={role.isSystem}
                        onClick={() => setDeleteRoleId(role.id)}
                      >
                        {uiCopy("delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleDialog
        open={createOpen}
        title={uiCopy("create-role")}
        submitLabel="Create"
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createRole.mutateAsync(values).then(() => setCreateOpen(false))}
      />

      <RoleDialog
        open={!!editRole}
        title={uiCopy("edit-role")}
        submitLabel="Save"
        role={editRole}
        disableName={editRole?.isSystem}
        onClose={() => setEditRole(null)}
        onSubmit={(values) =>
          editRole
            ? updateRole
                .mutateAsync({ roleId: editRole.id, patch: values })
                .then(() => setEditRole(null))
            : Promise.resolve()
        }
      />

      <AlertDialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{uiCopy("delete-role")}</AlertDialogTitle>
            <AlertDialogDescription>{uiCopy("this-action-cannot-be")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{uiCopy("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteRoleId
                  ? deleteRole.mutateAsync(deleteRoleId).then(() => setDeleteRoleId(null))
                  : Promise.resolve()
              }
            >
              {uiCopy("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RoleDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  role?: RoleDto | null;
  disableName?: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; description?: string | null }) => Promise<void>;
}

const RoleDialog: React.FC<RoleDialogProps> = ({
  open,
  title,
  submitLabel,
  role,
  disableName = false,
  onClose,
  onSubmit,
}) => {
  const uiCopy = useUiCopy("ui.settings-rolespage");
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");

  React.useEffect(() => {
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
  }, [role, open]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{uiCopy("name")}</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={uiCopy("role-name")}
              disabled={disableName}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("description")}</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={uiCopy("what-can-this-role")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {uiCopy("cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={() => onSubmit({ name, description: description || null })}
            disabled={!name.trim()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
