import React from "react";
import type { WebsiteMenuPublic, WebsiteSiteSettings } from "@corely/contracts";

export const PublicSiteLayout = ({
  menus,
  settings,
  host,
  previewMode,
  basePath,
  children,
}: {
  menus: WebsiteMenuPublic[];
  settings?: WebsiteSiteSettings;
  host?: string | null;
  previewMode?: boolean;
  basePath?: string;
  children: React.ReactNode;
}) => {
  const theme = settings?.theme;
  const tokenVars: Record<string, string | number> = {};

  if (theme?.colors?.primary) {
    tokenVars["--website-color-primary"] = theme.colors.primary;
  }
  if (theme?.colors?.accent) {
    tokenVars["--website-color-accent"] = theme.colors.accent;
  }
  if (theme?.colors?.background) {
    tokenVars["--website-color-background"] = theme.colors.background;
  }
  if (theme?.colors?.text) {
    tokenVars["--website-color-text"] = theme.colors.text;
  }
  if (theme?.typography?.headingFont) {
    tokenVars["--website-font-heading"] = theme.typography.headingFont;
  }
  if (theme?.typography?.bodyFont) {
    tokenVars["--website-font-body"] = theme.typography.bodyFont;
  }
  if (theme?.radius) {
    tokenVars["--website-radius"] = theme.radius;
  }
  for (const [key, value] of Object.entries(theme?.tokens ?? {})) {
    tokenVars[`--website-token-${key}`] =
      typeof value === "string" || typeof value === "number" ? value : JSON.stringify(value);
  }

  const themeStyle = tokenVars as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background text-foreground" style={themeStyle}>
      {previewMode ? (
        <div className="fixed right-4 top-4 z-50 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Preview mode
        </div>
      ) : null}
      <main className="min-h-[70vh]">{children}</main>
    </div>
  );
};
