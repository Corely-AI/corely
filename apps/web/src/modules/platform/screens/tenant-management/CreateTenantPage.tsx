import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { useCreateTenant } from "../../hooks/useCreateTenant";
import {
  tenantFormSchema,
  getDefaultTenantFormValues,
  type TenantFormValues,
} from "../../schemas/tenant-form.schema";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { useApiErrorToast } from "@/shared/lib/errors/use-api-error-toast";

export default function CreateTenantPage() {
  const uiCopy = useUiCopy("ui.platform-tenant-management-createtenantpage");
  const navigate = useNavigate();
  const showErrorToast = useApiErrorToast();
  const createTenant = useCreateTenant();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: getDefaultTenantFormValues(),
  });

  const nameValue = form.watch("name");
  const slugRegister = form.register("slug");

  useEffect(() => {
    if (slugTouched) {
      return;
    }
    const nextSlug = slugify(nameValue || "");
    form.setValue("slug", nextSlug, { shouldValidate: true });
  }, [form, nameValue, slugTouched]);

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: "Active" },
      { value: "SUSPENDED", label: "Suspended" },
      { value: "ARCHIVED", label: "Archived" },
    ],
    []
  );

  const onSubmit = (values: TenantFormValues) => {
    createTenant.mutate(values, {
      onSuccess: () => {
        toast.success(uiCopy("tenant-created-successfully"));
        navigate("/settings/tenants");
      },
      onError: (error) => {
        const fieldErrors = mapValidationErrorsToForm(error);
        Object.entries(fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof TenantFormValues, { message });
        });
        showErrorToast(error, { title: "Failed to create tenant" });
      },
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings/tenants")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{uiCopy("create-tenant")}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/settings/tenants")}
            disabled={createTenant.isPending}
          >
            {uiCopy("cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createTenant.isPending}
          >
            {createTenant.isPending ? uiCopy("creating") : uiCopy("create-tenant")}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">
                  {uiCopy("tenant-name") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder={uiCopy("acme-inc")}
                  data-testid="tenant-name-input"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">
                  {uiCopy("slug-code") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  {...slugRegister}
                  placeholder="acme-inc"
                  onChange={(event) => {
                    setSlugTouched(true);
                    void slugRegister.onChange(event);
                  }}
                  data-testid="tenant-slug-input"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.slug.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="status">{uiCopy("status")}</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value ?? "ACTIVE"} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={uiCopy("select-status")} />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">{uiCopy("notes")}</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder={uiCopy("optional-notes-for-internal")}
                  rows={4}
                />
                {form.formState.errors.notes && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/\\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
