import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useToast } from "@/shared/ui/use-toast";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";

export const WorkspaceSettingsPage: React.FC = () => {
  const { activeWorkspace, activeWorkspaceId, refresh } = useWorkspace();
  const { config, refresh: refreshConfig } = useWorkspaceConfig();
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
  const [isUpgrading, setIsUpgrading] = useState(false);

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

  const handleUpgrade = async () => {
    if (!activeWorkspaceId) {
      return;
    }
    setIsUpgrading(true);
    try {
      await workspacesApi.upgradeWorkspace(activeWorkspaceId);
      await refresh();
      await refreshConfig();
      toast({
        title: "Workspace upgraded",
        description: "Your workspace now uses company defaults.",
      });
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const workspaceKind = config?.kind ?? activeWorkspace?.kind ?? "PERSONAL";
  const canUpgrade = workspaceKind === "PERSONAL" && config?.currentUser.isWorkspaceAdmin;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Workspace settings</h1>
          <p className="text-muted-foreground">Update legal details, currency, and address.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          Save changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Legal name</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder="Registered name for invoices"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="EUR"
            />
          </div>
          <div className="space-y-2">
            <Label>Country code</Label>
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
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label>Street</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              placeholder="Street and number"
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Postal code</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Site Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Workspace Slug</Label>
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
              This slug will be used in your public URLs:{" "}
              <code className="bg-muted px-1 rounded">
                /w/{form.slug || "your-slug"}/rental/...
              </code>
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="public-enabled">Enable Public Site</Label>
              <p className="text-sm text-muted-foreground">
                Allow public access to your published content (rentals, CMS posts, etc.)
              </p>
            </div>
            <Switch
              id="public-enabled"
              checked={form.publicEnabled}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, publicEnabled: checked }))}
            />
          </div>

          {form.publicEnabled && !form.slug && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ You need to set a workspace slug to use the public site features.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current kind:</span>
            <Badge variant="secondary">
              {workspaceKind === "PERSONAL" ? "Freelancer" : "Company"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Freelancer workspaces use minimal defaults. Upgrading keeps all data and unlocks company
            capabilities.
          </p>
          <div>
            <Button onClick={handleUpgrade} disabled={!canUpgrade || isUpgrading}>
              {isUpgrading ? "Upgrading..." : "Upgrade to Company"}
            </Button>
            {!config?.currentUser.isWorkspaceAdmin && (
              <p className="text-xs text-muted-foreground mt-2">
                Only workspace admins can upgrade.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Removing a workspace will delete its data. This action will be restricted to owners in a
            future update.
          </p>
          <Button variant="destructive" disabled>
            Delete workspace (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
