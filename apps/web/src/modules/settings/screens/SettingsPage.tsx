import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { useThemeStore } from "@/shared/theme/themeStore";
import { getDb } from "@/shared/mock/mockDb";
import { Moon, Sun, Monitor, Globe } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const db = getDb();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  const activeTenant = useMemo(() => {
    if (!user) {
      return null;
    }
    if (user.activeTenantId) {
      return (
        user.memberships.find((membership) => membership.tenantId === user.activeTenantId) ??
        user.memberships[0] ??
        null
      );
    }

    if (activeWorkspaceId) {
      return (
        user.memberships.find((membership) => membership.workspaceId === activeWorkspaceId) ??
        user.memberships[0] ??
        null
      );
    }

    return user.memberships[0] ?? null;
  }, [user, activeWorkspaceId]);

  const tenantIdValue = user?.activeTenantId ?? activeTenant?.tenantId ?? "";
  const tenantNameValue = activeTenant?.tenantName ?? "";

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("bizflow-language", lang);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-h1 text-foreground">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("settings.name")}</Label>
              <Input defaultValue={db.user.name} />
            </div>
            <div>
              <Label>{t("settings.email")}</Label>
              <Input defaultValue={db.user.email} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tenant ID</Label>
              <Input
                value={tenantIdValue}
                placeholder="Not available"
                readOnly
                className="bg-muted/40"
              />
            </div>
            <div>
              <Label>Tenant name</Label>
              <Input
                value={tenantNameValue}
                placeholder="Not available"
                readOnly
                className="bg-muted/40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "light", icon: Sun },
              { value: "dark", icon: Moon },
              { value: "system", icon: Monitor },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? "accent" : "outline"}
                onClick={() => setTheme(value as any)}
                className="flex-1"
              >
                <Icon className="h-4 w-4 mr-2" />
                {t(`settings.themes.${value}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { code: "de", label: "🇩🇪 Deutsch" },
              { code: "en", label: "🇬🇧 English" },
            ].map(({ code, label }) => (
              <Button
                key={code}
                variant={i18n.language === code ? "accent" : "outline"}
                onClick={() => changeLanguage(code)}
                className="flex-1"
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">Classes</div>
              <div className="text-sm text-muted-foreground">
                Configure billing strategy for class invoices.
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/classes">Open</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
