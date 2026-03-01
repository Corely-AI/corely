import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandRegistry } from "./command-registry";
import { buildCommandSections, getRecentCommandIds, rankCommands } from "./match";
import { CommandPaletteDialog } from "./command-palette-dialog";
import { loadRecents, recordUse } from "./recents-storage";
import type { Command, CommandContext } from "./types";

interface CommandPaletteProviderProps {
  children: React.ReactNode;
  commandContext: Omit<CommandContext, "closePalette">;
  initialCommands?: Command[];
  initialNamespace?: string;
}

export interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setCommands: (commands: Command[]) => void;
  setNamespace: (namespace: string) => void;
}

const DEFAULT_NAMESPACE = "anon:default";

const resolveNamespace = (namespace?: string): string => {
  const normalized = namespace?.trim();
  if (!normalized) {
    return DEFAULT_NAMESPACE;
  }

  return normalized;
};

export const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(
  undefined
);

export const CommandPaletteProvider = ({
  children,
  commandContext,
  initialCommands = [],
  initialNamespace = DEFAULT_NAMESPACE,
}: CommandPaletteProviderProps) => {
  const registryRef = useRef(new CommandRegistry(initialCommands));
  const [commands, setInternalCommands] = useState<Command[]>(() =>
    registryRef.current.getCommands()
  );
  const [namespace, setInternalNamespace] = useState<string>(() =>
    resolveNamespace(initialNamespace)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentsState, setRecentsState] = useState(() =>
    loadRecents(resolveNamespace(initialNamespace))
  );
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const captureFocusedElement = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    previouslyFocusedElementRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
  }, []);

  const open = useCallback(() => {
    captureFocusedElement();
    setIsOpen(true);
  }, [captureFocusedElement]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      if (!current) {
        captureFocusedElement();
      }

      return !current;
    });
  }, [captureFocusedElement]);

  const setCommands = useCallback((nextCommands: Command[]) => {
    registryRef.current.setCommands(nextCommands);
    setInternalCommands(registryRef.current.getCommands());
  }, []);

  const setNamespace = useCallback((nextNamespace: string) => {
    setInternalNamespace(resolveNamespace(nextNamespace));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      toggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setQuery("");

    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    if (!previouslyFocusedElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (document.contains(previouslyFocusedElement)) {
        previouslyFocusedElement.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isOpen]);

  const resolvedCommandContext = useMemo<CommandContext>(
    () => ({
      ...commandContext,
      closePalette: close,
    }),
    [close, commandContext]
  );

  const availableCommands = useMemo(
    () => commands.filter((command) => command.isAvailable?.(resolvedCommandContext) ?? true),
    [commands, resolvedCommandContext]
  );

  useEffect(() => {
    setRecentsState(loadRecents(namespace));
  }, [namespace]);

  const rankedCommands = useMemo(
    () =>
      rankCommands({
        commands: availableCommands,
        query,
        recentsState,
      }),
    [availableCommands, query, recentsState]
  );

  const recentCommandIds = useMemo(
    () =>
      getRecentCommandIds({
        commands: availableCommands,
        recentsState,
      }),
    [availableCommands, recentsState]
  );

  const commandSections = useMemo(
    () =>
      buildCommandSections({
        rankedCommands,
        query,
        recentCommandIds,
      }),
    [rankedCommands, query, recentCommandIds]
  );

  const dialogSections = useMemo(
    () =>
      commandSections.map((section) => ({
        group: section.group,
        commands: section.commands.map((entry) => entry.command),
      })),
    [commandSections]
  );

  const onCommandSelect = useCallback(
    async (command: Command) => {
      recordUse(namespace, command.id);
      setRecentsState(loadRecents(namespace));
      close();

      try {
        await command.run(resolvedCommandContext);
      } catch (error) {
        console.error("[CommandPalette] Failed to run command", command.id, error);
      }
    },
    [namespace, close, resolvedCommandContext]
  );

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      setCommands,
      setNamespace,
    }),
    [isOpen, open, close, toggle, setCommands, setNamespace]
  );

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPaletteDialog
        isOpen={isOpen}
        query={query}
        sections={dialogSections}
        onOpenChange={(openState) => {
          if (openState) {
            open();
            return;
          }

          close();
        }}
        onQueryChange={setQuery}
        onCommandSelect={(command) => {
          void onCommandSelect(command);
        }}
      />
    </CommandPaletteContext.Provider>
  );
};
