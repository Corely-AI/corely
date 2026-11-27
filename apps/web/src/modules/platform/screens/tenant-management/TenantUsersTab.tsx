import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { toast } from "sonner";
import type { RoleDto, TenantUserDto } from "@corely/contracts";
import {
  useTenantUsers,
  useCreateTenantUser,
  useUpdateTenantUserRole,
} from "../../hooks/useTenantUsers";
import { useApiErrorToast } from "@/shared/lib/errors/use-api-error-toast";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { z } from "zod";
import { CreateTenantUserInputSchema } from "@corely/contracts";

const tenantUserFormSchema = CreateTenantUserInputSchema.omit({ idempotencyKey: true }).extend({
  name: z.string().optional().nullable(),
});
type TenantUserFormValues = z.infer<typeof tenantUserFormSchema>;

interface TenantUsersTabProps {
  tenantId: string;
}

export function TenantUsersTab({ tenantId }: TenantUsersTabProps) {
  const uiCopy = useUiCopy("ui.platform-tenant-management-tenantuserstab");
  const showErrorToast = useApiErrorToast();
  const { data, isLoading } = useTenantUsers(tenantId);
  const createUser = useCreateTenantUser(tenantId);
  const updateRole = useUpdateTenantUserRole(tenantId);

  const roles = data?.roles ?? [];
  const users = data?.users ?? [];

  const form = useForm<TenantUserFormValues>({
    resolver: zodResolver(tenantUserFormSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      roleId: roles[0]?.id ?? "",
    },
  });

  useEffect(() => {
    if (!form.getValues("roleId") && roles.length > 0) {
      form.setValue("roleId", roles[0].id, { shouldValidate: true });
    }
  }, [form, roles]);

  const onSubmit = (values: TenantUserFormValues) => {
    createUser.mutate(values, {
      onSuccess: () => {
        toast.success(uiCopy("user-added-to-tenant"));
        form.reset({ email: "", name: "", password: "", roleId: roles[0]?.id ?? "" });
      },
      onError: (error) => {
        const fieldErrors = mapValidationErrorsToForm(error);
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof TenantUserFormValues, { message });
        });
        showErrorToast(error, { title: "Failed to add user" });
      },
    });
  };

  const handleRoleChange = (user: TenantUserDto, roleId: string) => {
    if (user.roleId === roleId) {
      return;
    }
    updateRole.mutate(
      { membershipId: user.membershipId, roleId },
      {
        onSuccess: () => {
          toast.success(uiCopy("role-updated"));
        },
        onError: (error) => {
          showErrorToast(error, { title: "Failed to update role" });
        },
      }
    );
  };

  if (isLoading) {
    return <PageLoadingSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("add-user")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{uiCopy("email")}</Label>
            <Input
              placeholder="user@company.com"
              {...form.register("email")}
              data-testid="tenant-user-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("name")}</Label>
            <Input placeholder={uiCopy("full-name")} {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("password")}</Label>
            <Input
              type="password"
              placeholder={uiCopy("temporary-password")}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("role")}</Label>
            <Select
              value={form.watch("roleId")}
              onValueChange={(value) => form.setValue("roleId", value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={uiCopy("select-role")} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role: RoleDto) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.roleId && (
              <p className="text-sm text-destructive">{form.formState.errors.roleId.message}</p>
            )}
          </div>
          <Button
            className="md:col-span-2"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createUser.isPending}
          >
            {createUser.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              uiCopy("add-user")
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("users")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("name")}</TableHead>
                <TableHead>{uiCopy("email")}</TableHead>
                <TableHead>{uiCopy("status")}</TableHead>
                <TableHead>{uiCopy("role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {uiCopy("no-users-found")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.membershipId}>
                    <TableCell>{user.name ?? "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-xs uppercase">{user.status}</TableCell>
                    <TableCell>
                      <Select
                        value={user.roleId}
                        onValueChange={(value) => handleRoleChange(user, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role: RoleDto) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
