import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import type { WebsiteSiteThemeSettings } from "@corely/contracts";
import { Input, Label } from "@corely/ui";

type WebsiteSiteEditorThemeTokensSectionProps = {
  theme: WebsiteSiteThemeSettings;
  syncTheme: (next: WebsiteSiteThemeSettings) => void;
};

export function WebsiteSiteEditorThemeTokensSection({
  theme,
  syncTheme,
}: WebsiteSiteEditorThemeTokensSectionProps) {
  const uiCopy = useUiCopy("ui.website-website-site-editor-theme-tokens-section");
  return (
    <div className="space-y-2">
      <Label>{uiCopy("theme-tokens")}</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder={uiCopy("primary-color")}
          value={theme.colors?.primary ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              colors: {
                ...theme.colors,
                primary: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("accent-color")}
          value={theme.colors?.accent ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              colors: {
                ...theme.colors,
                accent: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("background-color")}
          value={theme.colors?.background ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              colors: {
                ...theme.colors,
                background: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("text-color")}
          value={theme.colors?.text ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              colors: {
                ...theme.colors,
                text: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("heading-font-token")}
          value={theme.typography?.headingFont ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              typography: {
                ...theme.typography,
                headingFont: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("body-font-token")}
          value={theme.typography?.bodyFont ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              typography: {
                ...theme.typography,
                bodyFont: event.target.value.trim() ? event.target.value : undefined,
              },
            })
          }
        />
        <Input
          placeholder={uiCopy("radius")}
          value={theme.radius ?? ""}
          onChange={(event) =>
            syncTheme({
              ...theme,
              radius: event.target.value.trim() ? event.target.value : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
