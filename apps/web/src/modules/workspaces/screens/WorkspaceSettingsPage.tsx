import { ExpenseReceiptEmailSettingsCard } from "./ExpenseReceiptEmailSettingsCard";
import { InvoiceEmailSettingsCard } from "./InvoiceEmailSettingsCard";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Separator } from "@corely/ui";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useToast } from "@corely/ui";
import { Switch } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@corely/ui";
import { useAuth } from "@/lib/auth-provider";

export const WorkspaceSettingsPage: React.FC = () => {
  const uiCopy = useUiCopy("ui.workspaces-workspacesettingspage");
  const { activeWorkspace, activeWorkspaceId, refresh } = useWorkspace();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    countryCode: "",
    currency: "",
    taxId: "",
    addressLine1: "",
    city: "",
    postalCode: "",
    slug: "",
    publicEnabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tenantName = useMemo(() => {
    if (!user) {
      return "";
    }

    const byWorkspace = activeWorkspaceId
      ? user.memberships.find(
          (membership) =>
            membership.workspaceId === activeWorkspaceId ||
            membership.tenantId === activeWorkspaceId
        )
      : undefined;

    if (byWorkspace?.tenantName) {
      return byWorkspace.tenantName;
    }

    const byTenant = user.activeTenantId
      ? user.memberships.find((membership) => membership.tenantId === user.activeTenantId)
      : undefined;

    return byTenant?.tenantName ?? "";
  }, [activeWorkspaceId, user]);

  useEffect(() => {
    if (activeWorkspace) {
      setForm({
        name: activeWorkspace.name,
        legalName: activeWorkspace.legalName ?? "",
        countryCode: activeWorkspace.countryCode ?? "",
        currency: activeWorkspace.currency ?? "",
        taxId: activeWorkspace.taxId ?? "",
        addressLine1: activeWorkspace.address?.line1 ?? "",
        city: activeWorkspace.address?.city ?? "",
        postalCode: activeWorkspace.address?.postalCode ?? "",
        slug: activeWorkspace.slug ?? "",
        publicEnabled: activeWorkspace.publicEnabled ?? false,
      });
    }
  }, [activeWorkspace]);

  if (!activeWorkspaceId) {
    navigate("/onboarding");
    return null;
  }

  const handleSave = async () => {
    if (!activeWorkspaceId) {
      return;
    }
    setIsSaving(true);
    try {
      await workspacesApi.updateWorkspace(activeWorkspaceId, {
        name: form.name,
        legalName: form.legalName,
        countryCode: form.countryCode,
        currency: form.currency,
        taxId: form.taxId || undefined,
        slug: form.slug || undefined,
        publicEnabled: form.publicEnabled,
        address:
          form.addressLine1 || form.city || form.postalCode
            ? {
                line1: form.addressLine1,
                city: form.city,
                postalCode: form.postalCode,
                countryCode: form.countryCode || activeWorkspace?.countryCode || "DE",
              }
            : undefined,
      });
      await refresh();
      toast({ title: "Workspace updated", description: "Your workspace settings were saved." });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspaceId) {
      return;
    }
    setIsDeleting(true);
    try {
      await workspacesApi.deleteWorkspace(activeWorkspaceId);
      await refresh();
      toast({
        title: "Workspace deleted",
        description: "The workspace has been removed.",
      });
      // Redirect to onboarding or another workspace
      navigate("/onboarding");
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1">{uiCopy("workspace-settings")}</h1>
          {activeWorkspace && (
            <p className="break-words font-medium text-foreground">{activeWorkspace.name}</p>
          )}
          <p className="text-muted-foreground">{uiCopy("update-legal-details-currency")}</p>
        </div>
        <Button className="shrink-0" onClick={handleSave} disabled={isSaving}>
          {uiCopy("save-changes")}
        </Button>
      </div>

      <section aria-labelledby="email-forwarding" className="space-y-4 has-[>div:empty]:hidden">
        <h2 id="email-forwarding" className="text-h2">
          {t("settings.emailForwarding")}
        </h2>
        <div className="space-y-4">
          <InvoiceEmailSettingsCard key={activeWorkspaceId} workspaceId={activeWorkspaceId} />
          <ExpenseReceiptEmailSettingsCard
            key={`expense-${activeWorkspaceId}`}
            workspaceId={activeWorkspaceId}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{uiCopy("name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("tenant-name")}</Label>
            <Input value={tenantName} readOnly />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("legal-name")}</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder={uiCopy("registered-name-for-invoices")}
            />
          </div>
          {activeWorkspace && (
            <div className="space-y-2">
              <Label htmlFor="workspace-legal-entity-type">{t("workspace.legalEntityType")}</Label>
              <Input
                id="workspace-legal-entity-type"
                value={
                  activeWorkspace.kind === "COMPANY"
                    ? t("workspace.legalEntityCompany")
                    : t("workspace.legalEntityPersonal")
                }
                readOnly
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{uiCopy("currency")}</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="EUR"
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("country-code")}</Label>
            <Input
              value={form.countryCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
              }
              placeholder="DE"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("address")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label>{uiCopy("street")}</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              placeholder={uiCopy("street-and-number")}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("city")}</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("postal-code")}</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("tax-id")}</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("public-site-settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">{uiCopy("workspace-slug")}</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                const value = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-")
                  .substring(0, 50);
                setForm((f) => ({ ...f, slug: value }));
              }}
              placeholder="my-workspace"
            />
            <p className="text-xs text-muted-foreground">
              {uiCopy("this-slug-will-be")}{" "}
              <code className="bg-muted px-1 rounded">
                {uiCopy("w")}
                {form.slug || "your-slug"}
                {uiCopy("rental")}
              </code>
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="public-enabled">{uiCopy("enable-public-site")}</Label>
              <p className="text-sm text-muted-foreground">{uiCopy("allow-public-access-to")}</p>
            </div>
            <Switch
              id="public-enabled"
              checked={form.publicEnabled}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, publicEnabled: checked }))}
            />
          </div>

          {form.publicEnabled && !form.slug && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
              {uiCopy("you-need-to-set")}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("danger-zone")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{uiCopy("removing-a-workspace-will")}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? uiCopy("deleting") : uiCopy("delete-workspace")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{uiCopy("are-you-absolutely-sure")}</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the workspace &quot;
                  {activeWorkspace?.name}&quot; and remove all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{uiCopy("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {uiCopy("delete-workspace-2")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
