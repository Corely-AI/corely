import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { persistFocusedLocale } from "@corely/web-shared/session/focused-locale";
import { corelyLocaleDetails, corelyLocales, type CorelyLocale } from "@corely/contracts";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { useThemeStore } from "@/shared/theme/themeStore";
import { Moon, Sun, Monitor } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { accountSettingsSectionId, settingsDestinations } from "../settings-navigation";

export default function SettingsPage() {
  const uiCopy = useUiCopy("ui.settings-settingspage");
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { hash } = useLocation();
  const accountHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (hash === `#${accountSettingsSectionId}`) {
      accountHeading.current?.focus();
    }
  }, [hash]);

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

  const changeLanguage = (lang: CorelyLocale) => {
    void i18n.changeLanguage(lang);
    persistFocusedLocale(lang);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-h1 text-foreground">{t("settings.title")}</h1>

      <nav aria-label={t("settings.title")} className="grid gap-3 sm:grid-cols-2">
        {settingsDestinations(Boolean(activeWorkspaceId)).map(({ to, label, description }) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-border bg-card p-4 text-card-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <span className="block font-medium">{t(label)}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{t(description)}</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby={accountSettingsSectionId} className="space-y-4">
        <h2
          ref={accountHeading}
          id={accountSettingsSectionId}
          tabIndex={-1}
          className="text-h2 scroll-mt-4"
        >
          {t("settings.navigation.myAccount")}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-profile-name">{t("settings.name")}</Label>
                <Input id="settings-profile-name" value={user?.name ?? ""} readOnly />
              </div>
              <div>
                <Label htmlFor="settings-profile-email">{t("settings.email")}</Label>
                <Input id="settings-profile-email" value={user?.email ?? ""} readOnly />
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
              {(
                [
                  { value: "light", icon: Sun },
                  { value: "dark", icon: Moon },
                  { value: "system", icon: Monitor },
                ] as const
              ).map(({ value, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? "accent" : "outline"}
                  onClick={() => setTheme(value)}
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
            <div className="flex flex-wrap gap-2">
              {corelyLocales.map((code) => (
                <Button
                  key={code}
                  variant={i18n.language === code ? "accent" : "outline"}
                  onClick={() => changeLanguage(code)}
                  lang={code}
                >
                  {corelyLocaleDetails[code].name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("tenant")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{uiCopy("tenant-id")}</Label>
              <Input
                value={tenantIdValue}
                placeholder={uiCopy("not-available")}
                readOnly
                className="bg-muted/40"
              />
            </div>
            <div>
              <Label>{uiCopy("tenant-name")}</Label>
              <Input
                value={tenantNameValue}
                placeholder={uiCopy("not-available")}
                readOnly
                className="bg-muted/40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("module-settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">{uiCopy("classes")}</div>
              <div className="text-sm text-muted-foreground">
                {uiCopy("configure-billing-strategy-for")}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/classes">{uiCopy("open")}</Link>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">{uiCopy("engagement-templates")}</div>
              <div className="text-sm text-muted-foreground">
                {uiCopy("manage-reusable-email-and")}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/engagement/templates">{uiCopy("open")}</Link>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">{uiCopy("dimensions")}</div>
              <div className="text-sm text-muted-foreground">
                {uiCopy("manage-reporting-segments-for")}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/custom-attributes/dimensions">{uiCopy("open")}</Link>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">{uiCopy("custom-fields")}</div>
              <div className="text-sm text-muted-foreground">
                {uiCopy("define-custom-field-schemas")}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/custom-attributes/custom-fields">{uiCopy("open")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
