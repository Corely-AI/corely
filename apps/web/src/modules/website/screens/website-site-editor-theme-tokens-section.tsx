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
  return (
    <div className="space-y-2">
      <Label>Theme tokens</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Primary color"
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
          placeholder="Accent color"
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
          placeholder="Background color"
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
          placeholder="Text color"
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
          placeholder="Heading font token"
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
          placeholder="Body font token"
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
          placeholder="Radius"
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
