import type { Command, CommandContext, CommandGroup } from "./types";

const DEFAULT_GROUP_ORDER = ["Recent", "Navigate", "Create", "General"] as const;

export class CommandRegistry {
  private commands: Command[] = [];

  constructor(initialCommands: Command[] = []) {
    this.setCommands(initialCommands);
  }

  setCommands(nextCommands: Command[]): void {
    const deduped = new Map<string, Command>();

    for (const command of nextCommands) {
      const id = command.id.trim();
      if (!id || deduped.has(id)) {
        continue;
      }

      deduped.set(id, { ...command, id });
    }

    this.commands = Array.from(deduped.values());
  }

  getCommands(): Command[] {
    return this.commands;
  }

  getAvailableCommands(ctx: CommandContext): Command[] {
    return this.commands.filter((command) => command.isAvailable?.(ctx) ?? true);
  }
}

export const getGroupRank = (group: CommandGroup): number => {
  const index = DEFAULT_GROUP_ORDER.indexOf(group as (typeof DEFAULT_GROUP_ORDER)[number]);
  if (index >= 0) {
    return index;
  }

  return DEFAULT_GROUP_ORDER.length;
};
