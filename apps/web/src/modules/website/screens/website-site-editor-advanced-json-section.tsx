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
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="advanced-json">
        <AccordionTrigger>Advanced JSON</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Directly edit raw common/theme JSON. Apply to overwrite structured fields.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Common JSON</Label>
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
                Apply common JSON
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Theme JSON</Label>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={themeJson}
                onChange={(event) => onThemeJsonChange(event.target.value)}
              />
              {themeJsonError ? <p className="text-xs text-destructive">{themeJsonError}</p> : null}
              <Button type="button" variant="ghost" size="sm" onClick={onApplyThemeJson}>
                Apply theme JSON
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
