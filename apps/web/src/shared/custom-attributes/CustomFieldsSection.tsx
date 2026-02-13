import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import type { CustomizableEntityType } from "@corely/contracts";
import {
  useCustomFieldDefinitions,
  useCustomFieldLayout,
  useEntityCustomFieldValues,
} from "./hooks";

interface CustomFieldsSectionProps {
  entityType: CustomizableEntityType;
  entityId?: string;
  mode?: "edit" | "read";
  value?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
}

function isMoneyLikeValue(value: unknown): value is { amountCents: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "amountCents" in value &&
    typeof (value as { amountCents?: unknown }).amountCents === "number"
  );
}

function toDisplayValue(value: unknown): string {
  if (value == null) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

export function CustomFieldsSection({
  entityType,
  entityId,
  mode = "edit",
  value,
  onChange,
}: CustomFieldsSectionProps) {
  const { data: definitions = [], isLoading: isDefinitionsLoading } =
    useCustomFieldDefinitions(entityType);
  const { data: layout } = useCustomFieldLayout(entityType);
  const { data: entityValuesResponse, isLoading: isEntityValuesLoading } =
    useEntityCustomFieldValues(entityId ? { entityType, entityId } : undefined);

  const [localValues, setLocalValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (value) {
      setLocalValues(value);
      return;
    }
    if (entityValuesResponse?.values) {
      setLocalValues(entityValuesResponse.values);
    }
  }, [value, entityValuesResponse]);

  const currentValues = value ?? localValues;

  const updateValue = (fieldId: string, fieldKey: string, nextValue: unknown) => {
    const next = {
      ...currentValues,
      [fieldId]: nextValue,
      [fieldKey]: nextValue,
    };
    if (!value) {
      setLocalValues(next);
    }
    onChange?.(next);
  };

  if (isDefinitionsLoading || isEntityValuesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading custom fields...</div>
        </CardContent>
      </Card>
    );
  }

  const activeDefinitions = definitions.filter((definition) => definition.isActive);
  if (activeDefinitions.length === 0) {
    return null;
  }

  const orderedDefinitions = (() => {
    const order = layout?.layout?.sections?.flatMap((section) => section.fieldKeys) ?? [];
    const byKey = new Map(activeDefinitions.map((definition) => [definition.key, definition]));
    const ordered: typeof activeDefinitions = [];

    for (const key of order) {
      const definition = byKey.get(key);
      if (definition) {
        ordered.push(definition);
        byKey.delete(key);
      }
    }

    return [...ordered, ...Array.from(byKey.values())];
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderedDefinitions.map((definition) => {
          const raw = currentValues[definition.id] ?? currentValues[definition.key];
          const key = definition.id;

          if (mode === "read") {
            return (
              <div key={key} className="space-y-1">
                <Label>{definition.label}</Label>
                <div className="text-sm text-muted-foreground">{toDisplayValue(raw)}</div>
              </div>
            );
          }

          switch (definition.type) {
            case "NUMBER":
              return (
                <div key={key} className="space-y-1">
                  <Label>{definition.label}</Label>
                  <Input
                    type="number"
                    value={raw == null ? "" : String(raw)}
                    onChange={(event) =>
                      updateValue(definition.id, definition.key, Number(event.target.value))
                    }
                  />
                </div>
              );
            case "DATE":
              return (
                <div key={key} className="space-y-1">
                  <Label>{definition.label}</Label>
                  <Input
                    type="date"
                    value={raw == null ? "" : String(raw).slice(0, 10)}
                    onChange={(event) =>
                      updateValue(definition.id, definition.key, event.target.value)
                    }
                  />
                </div>
              );
            case "BOOLEAN":
              return (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(raw)}
                    onCheckedChange={(checked) =>
                      updateValue(definition.id, definition.key, checked === true)
                    }
                  />
                  <Label>{definition.label}</Label>
                </div>
              );
            case "SELECT":
              return (
                <div key={key} className="space-y-1">
                  <Label>{definition.label}</Label>
                  <Select
                    value={raw == null ? "" : String(raw)}
                    onValueChange={(nextValue) =>
                      updateValue(definition.id, definition.key, nextValue)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {(definition.options ?? []).map((option) => (
                        <SelectItem key={String(option)} value={String(option)}>
                          {String(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            case "MONEY":
              return (
                <div key={key} className="space-y-1">
                  <Label>{definition.label}</Label>
                  <Input
                    type="number"
                    value={isMoneyLikeValue(raw) ? String(raw.amountCents / 100) : ""}
                    onChange={(event) => {
                      const amount = Number(event.target.value || 0);
                      updateValue(definition.id, definition.key, {
                        amountCents: Math.round(amount * 100),
                      });
                    }}
                  />
                </div>
              );
            case "MULTI_SELECT":
              return (
                <div key={key} className="space-y-2">
                  <Label>{definition.label}</Label>
                  <div className="rounded-md border border-border p-3 space-y-2">
                    {(definition.options ?? []).map((option) => {
                      const arrayValue = Array.isArray(raw) ? (raw as unknown[]) : [];
                      const selected = arrayValue.includes(option);
                      return (
                        <div key={String(option)} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              const next = new Set(arrayValue.map((item) => String(item)));
                              if (checked === true) {
                                next.add(String(option));
                              } else {
                                next.delete(String(option));
                              }
                              updateValue(definition.id, definition.key, Array.from(next));
                            }}
                          />
                          <span className="text-sm">{String(option)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            case "TEXT":
            default:
              return (
                <div key={key} className="space-y-1">
                  <Label>{definition.label}</Label>
                  <Input
                    value={raw == null ? "" : String(raw)}
                    onChange={(event) =>
                      updateValue(definition.id, definition.key, event.target.value)
                    }
                  />
                </div>
              );
          }
        })}
      </CardContent>
    </Card>
  );
}
