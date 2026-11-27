import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Label,
  Textarea,
} from "@corely/ui";

type WebsiteSiteEditorAdvancedJsonSectionProps = {
  commonJson: string;
  themeJson: string;
  commonJsonError: string | null;
  themeJsonError: string | null;
  onCommonJsonChange: (value: string) => void;
  onThemeJsonChange: (value: string) => void;
  onApplyCommonJson: () => void;
  onApplyThemeJson: () => void;
};

export function WebsiteSiteEditorAdvancedJsonSection({
  commonJson,
  themeJson,
  commonJsonError,
  themeJsonError,
  onCommonJsonChange,
  onThemeJsonChange,
  onApplyCommonJson,
  onApplyThemeJson,
}: WebsiteSiteEditorAdvancedJsonSectionProps) {
  const uiCopy = useUiCopy("ui.website-website-site-editor-advanced-json-section");
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="advanced-json">
        <AccordionTrigger>{uiCopy("advanced-json")}</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{uiCopy("directly-edit-raw-common")}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{uiCopy("common-json")}</Label>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={commonJson}
                onChange={(event) => onCommonJsonChange(event.target.value)}
              />
              {commonJsonError ? (
                <p className="text-xs text-destructive">{commonJsonError}</p>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={onApplyCommonJson}>
                {uiCopy("apply-common-json")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{uiCopy("theme-json")}</Label>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={themeJson}
                onChange={(event) => onThemeJsonChange(event.target.value)}
              />
              {themeJsonError ? <p className="text-xs text-destructive">{themeJsonError}</p> : null}
              <Button type="button" variant="ghost" size="sm" onClick={onApplyThemeJson}>
                {uiCopy("apply-theme-json")}
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
