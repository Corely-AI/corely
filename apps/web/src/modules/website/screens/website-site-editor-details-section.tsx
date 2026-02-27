import { Input, Label, Switch } from "@corely/ui";

type WebsiteSiteEditorDetailsSectionProps = {
  name: string;
  slug: string;
  defaultLocale: string;
  isDefault: boolean;
  isLockedDefault: boolean;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onDefaultLocaleChange: (value: string) => void;
  onIsDefaultChange: (value: boolean) => void;
};

export function WebsiteSiteEditorDetailsSection({
  name,
  slug,
  defaultLocale,
  isDefault,
  isLockedDefault,
  onNameChange,
  onSlugChange,
  onDefaultLocaleChange,
  onIsDefaultChange,
}: WebsiteSiteEditorDetailsSectionProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Site name</Label>
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Site slug</Label>
          <Input
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            placeholder="my-site"
          />
        </div>
        <div className="space-y-2">
          <Label>Default locale</Label>
          <Input
            value={defaultLocale}
            onChange={(event) => onDefaultLocaleChange(event.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-4 py-3">
        <div>
          <Label>Default site</Label>
          <p className="text-sm text-muted-foreground">
            Use this site when no website slug is provided in the URL.
          </p>
        </div>
        <Switch
          checked={isDefault}
          disabled={isLockedDefault}
          onCheckedChange={(checked) => onIsDefaultChange(Boolean(checked))}
        />
      </div>
    </>
  );
}
