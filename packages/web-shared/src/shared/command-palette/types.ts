import type { ReactNode } from "react";

export type CommandId = string;
export type CommandGroup = "Navigate" | "Create" | "General" | "Recent" | (string & {});

export interface CommandContext {
  navigate: (to: string) => void;
  openExternal: (url: string) => void;
  closePalette: () => void;
  locationPathname?: string;
}

export interface Command {
  id: CommandId;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group: CommandGroup;
  icon?: ReactNode;
  isAvailable?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export interface CommandUsage {
  count: number;
  lastUsedAt: string;
}

export interface RecentsState {
  version: 1;
  used: Record<CommandId, CommandUsage>;
}

export interface RankedCommand {
  command: Command;
  score: number;
  textScore: number;
  frecencyScore: number;
}

export interface CommandGroupSection<TCommand = Command> {
  group: CommandGroup;
  commands: TCommand[];
}
