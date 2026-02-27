import React from "react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { ExternalLink } from "lucide-react";

type TemplateOption = {
  templateKey: string;
};

type PresetOption = {
  presetKey: string;
  label: string;
  templateKey: string;
};

type CmsEntryOption = {
  id: string;
  title: string;
};

type WebsitePageEditorDetailsCardProps = {
  isEdit: boolean;
  path: string;
  onPathChange: (value: string) => void;
  locale: string;
  onLocaleChange: (value: string) => void;
  presetKey: string;
  onPresetChange: (value: string) => void;
  availablePresets: PresetOption[];
  template: string;
  onTemplateChange: (value: string) => void;
  hasUnknownTemplate: boolean;
  availableTemplates: TemplateOption[];
  cmsEntryId: string;
  onCmsEntryChange: (value: string) => void;
  cmsEntryOptions: CmsEntryOption[];
  onEditCmsEntry: () => void;
  seoTitle: string;
  onSeoTitleChange: (value: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  seoImageFileId: string;
  onSeoImageFileIdChange: (value: string) => void;
};

export const WebsitePageEditorDetailsCard = (props: WebsitePageEditorDetailsCardProps) => (
  <Card>
    <CardContent className="space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Path</Label>
          <Input value={props.path} onChange={(event) => props.onPathChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Locale</Label>
          <Input
            value={props.locale}
            onChange={(event) => props.onLocaleChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Preset</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={props.presetKey}
            onChange={(event) => props.onPresetChange(event.target.value)}
          >
            {props.availablePresets.map((preset) => (
              <option key={preset.presetKey} value={preset.presetKey}>
                {`${preset.label} (${preset.templateKey})`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Template key</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={props.template}
            onChange={(event) => props.onTemplateChange(event.target.value)}
          >
            {props.hasUnknownTemplate ? (
              <option value={props.template}>{`${props.template} (legacy)`}</option>
            ) : null}
            {props.availableTemplates.map((definition) => (
              <option key={definition.templateKey} value={definition.templateKey}>
                {definition.templateKey}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>CMS entry (optional)</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={props.cmsEntryId}
            onChange={(event) => props.onCmsEntryChange(event.target.value)}
          >
            <option value="">Select a CMS entry</option>
            {props.cmsEntryOptions.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {props.cmsEntryId ? (
        <div>
          <Button variant="outline" onClick={props.onEditCmsEntry}>
            <ExternalLink className="h-4 w-4" />
            Edit CMS entry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>SEO title</Label>
          <Input
            value={props.seoTitle}
            onChange={(event) => props.onSeoTitleChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>SEO description</Label>
          <Textarea
            value={props.seoDescription}
            onChange={(event) => props.onSeoDescriptionChange(event.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>SEO image file ID</Label>
          <Input
            value={props.seoImageFileId}
            onChange={(event) => props.onSeoImageFileIdChange(event.target.value)}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);
