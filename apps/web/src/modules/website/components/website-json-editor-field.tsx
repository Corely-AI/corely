import React from "react";
import { Badge, Button, Label, Textarea } from "@corely/ui";
import type { JsonFieldState } from "./website-branding-theme-utils";

const jsonStatusBadge = (state: JsonFieldState) => {
  if (state.status === "empty") {
    return (
      <Badge variant="outline" className="text-xs">
        Empty
      </Badge>
    );
  }
  if (state.status === "invalid") {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        Invalid JSON
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      Valid JSON
    </Badge>
  );
};

type JsonEditorProps = {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onFormat: () => void;
  onUseExample: () => void;
  onClear: () => void;
  state: JsonFieldState;
  placeholder: string;
};

export const JsonEditorField = ({
  label,
  description,
  value,
  onChange,
  onFormat,
  onUseExample,
  onClear,
  state,
  placeholder,
}: JsonEditorProps) => (
  <div className="space-y-3 rounded-lg border border-input bg-muted/20 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {jsonStatusBadge(state)}
        <Button type="button" variant="ghost" size="sm" onClick={onFormat}>
          Format
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onUseExample}>
          Insert example
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={8}
      className="font-mono text-xs leading-5"
      placeholder={placeholder}
    />
    {state.preview ? (
      <div className="text-xs text-muted-foreground">Preview: {state.preview}</div>
    ) : null}
    {state.error ? <div className="text-xs text-destructive">{state.error}</div> : null}
  </div>
);
