import type React from "react";
import { Button } from "@corely/ui";

export interface Suggestion {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export interface CapabilityAction {
  title: string;
  description: string;
  prompt: string;
}

export interface CapabilityGroup {
  title: string;
  description?: string;
  items: CapabilityAction[];
}

type ChatEmptyStateProps = {
  suggestions: Suggestion[];
  capabilityGroups: CapabilityGroup[];
  capabilityCatalogTitle?: string;
  capabilityCatalogDescription?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onSelectPrompt: (prompt: string) => void;
};

export function ChatEmptyState({
  suggestions,
  capabilityGroups,
  capabilityCatalogTitle,
  capabilityCatalogDescription,
  emptyStateTitle,
  emptyStateDescription,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  if (suggestions.length === 0 && capabilityGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-dashed border-border/60 bg-background/60 p-6 text-center">
      <div className="mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-accent to-warning" />
      {emptyStateTitle ? (
        <h3 className="text-xl font-semibold text-foreground">{emptyStateTitle}</h3>
      ) : null}
      {emptyStateDescription ? (
        <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.label}
              variant="outline"
              size="lg"
              className="h-auto w-full justify-start gap-3 rounded-2xl border-border/60 bg-background/70 px-4 py-3 text-left shadow-[0_12px_30px_-24px_rgba(0,0,0,0.5)] hover:border-border-strong"
              onClick={() => onSelectPrompt(suggestion.value)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <suggestion.icon className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">{suggestion.label}</div>
                <div className="text-xs text-muted-foreground">{suggestion.value}</div>
              </div>
            </Button>
          ))}
        </div>
      ) : null}

      {capabilityGroups.length > 0 ? (
        <div className="space-y-4 text-left">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
            {capabilityCatalogTitle ? (
              <div className="text-sm font-semibold text-foreground">{capabilityCatalogTitle}</div>
            ) : null}
            {capabilityCatalogDescription ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {capabilityCatalogDescription}
              </div>
            ) : null}
          </div>

          {capabilityGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                {group.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {group.items.map((item) => (
                  <button
                    key={`${group.title}:${item.title}`}
                    type="button"
                    className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left transition hover:border-border-strong hover:bg-background"
                    onClick={() => onSelectPrompt(item.prompt)}
                  >
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                    <div className="mt-2 text-[11px] text-accent">{item.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
