import React, { useEffect, useMemo, useRef } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@corely/ui";
import type { Command as CommandEntry, CommandGroupSection } from "./types";

export interface CommandPaletteLabels {
  title: string;
  search: string;
  empty: string;
  groups: Record<string, string>;
}
const defaultLabels: CommandPaletteLabels = {
  title: "Command palette",
  search: "Search commands...",
  empty: "No results",
  groups: {},
};

interface CommandPaletteDialogProps {
  labels?: CommandPaletteLabels;
  isOpen: boolean;
  query: string;
  sections: CommandGroupSection[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onCommandSelect: (command: CommandEntry) => void;
}

const buildCommandValue = (command: CommandEntry): string =>
  [command.title, command.subtitle, ...(command.keywords ?? [])].filter(Boolean).join(" ");

export const CommandPaletteDialog = ({
  labels = defaultLabels,
  isOpen,
  query,
  sections,
  onOpenChange,
  onQueryChange,
  onCommandSelect,
}: CommandPaletteDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  const hasResults = useMemo(
    () => sections.some((section) => section.commands.length > 0),
    [sections]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl overflow-hidden p-0 gap-0"
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{labels.title}</DialogTitle>
        <Command label={labels.title} loop shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={onQueryChange}
            placeholder={labels.search}
            aria-label={labels.search}
            data-command-palette-input="true"
          />
          <CommandList className="max-h-[420px]">
            {hasResults ? (
              sections.map((section) => (
                <CommandGroup
                  key={section.group}
                  heading={labels.groups[section.group] ?? section.group}
                >
                  {section.commands.map((command) => (
                    <CommandItem
                      key={`${section.group}:${command.id}`}
                      value={buildCommandValue(command)}
                      onSelect={() => onCommandSelect(command)}
                    >
                      <div className="flex w-full items-center gap-3 overflow-hidden">
                        {command.icon ? (
                          <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
                            {command.icon}
                          </span>
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{command.title}</span>
                          {command.subtitle ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {command.subtitle}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {labels.empty}
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
