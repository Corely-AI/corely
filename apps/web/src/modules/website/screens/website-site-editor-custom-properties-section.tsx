import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Textarea } from "@corely/ui";
import type { Dispatch, SetStateAction } from "react";
import { createRowId, type CustomPropertyRow } from "./website-site-editor-utils";

type WebsiteSiteEditorCustomPropertiesSectionProps = {
  customRows: CustomPropertyRow[];
  customRowErrors: Record<string, string>;
  setCustomRows: Dispatch<SetStateAction<CustomPropertyRow[]>>;
  setCustomRowErrors: Dispatch<SetStateAction<Record<string, string>>>;
};

export function WebsiteSiteEditorCustomPropertiesSection({
  customRows,
  customRowErrors,
  setCustomRows,
  setCustomRowErrors,
}: WebsiteSiteEditorCustomPropertiesSectionProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Custom properties</h3>
          <p className="text-sm text-muted-foreground">
            Key/value JSON settings persisted through Custom Attributes.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            setCustomRows((prev) => [...prev, { id: createRowId(), key: "", valueText: "{}" }])
          }
        >
          <Plus className="h-4 w-4" />
          Add property
        </Button>
      </div>

      {customRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom properties yet.</p>
      ) : null}

      {customRows.map((row, index) => (
        <div key={row.id} className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Property #{index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setCustomRows((prev) => prev.filter((item) => item.id !== row.id));
                setCustomRowErrors((prev) => {
                  const next = { ...prev };
                  delete next[row.id];
                  return next;
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="analytics.ga4"
            value={row.key}
            onChange={(event) =>
              setCustomRows((prev) =>
                prev.map((item) =>
                  item.id === row.id ? { ...item, key: event.target.value } : item
                )
              )
            }
          />
          <Textarea
            rows={4}
            className="font-mono text-xs"
            placeholder='{"enabled": true}'
            value={row.valueText}
            onChange={(event) =>
              setCustomRows((prev) =>
                prev.map((item) =>
                  item.id === row.id ? { ...item, valueText: event.target.value } : item
                )
              )
            }
          />
          {customRowErrors[row.id] ? (
            <p className="text-xs text-destructive">{customRowErrors[row.id]}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
