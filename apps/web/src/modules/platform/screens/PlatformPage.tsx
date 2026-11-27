import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Link } from "react-router-dom";
import { Package, FileText, Boxes, Menu } from "lucide-react";

export function PlatformPage() {
  const uiCopy = useUiCopy("ui.platform-platformpage");
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-h1 text-foreground">{uiCopy("platform-management")}</h1>
        <p className="text-muted-foreground mt-2">{uiCopy("customize-your-workspace-by")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>{uiCopy("apps")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>{uiCopy("enable-or-disable-apps")}</CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/apps">{uiCopy("manage-apps")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>{uiCopy("templates")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>{uiCopy("apply-configuration-templates-to")}</CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/templates">{uiCopy("browse-templates")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <CardTitle>{uiCopy("packs")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>{uiCopy("install-complete-business-setups")}</CardDescription>
            <Button asChild className="w-full" disabled>
              <Link to="/settings/platform/packs">{uiCopy("view-packs-coming-soon")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-primary" />
              <CardTitle>{uiCopy("menu-customization")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>{uiCopy("customize-your-navigation-menu")}</CardDescription>
            <Button asChild className="w-full">
              <Link to="/settings/platform/menu">{uiCopy("customize-menu")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
