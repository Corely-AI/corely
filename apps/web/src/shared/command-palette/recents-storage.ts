import type { CommandId, CommandUsage, RecentsState } from "./types";

const STORAGE_PREFIX = "corely:command-recents:";
const DEFAULT_NAMESPACE = "anon:default";
const EMPTY_RECENTS: RecentsState = {
  version: 1,
  used: {},
};

const canUseLocalStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const resolveNamespace = (namespace?: string): string => {
  const normalized = namespace?.trim();
  if (!normalized) {
    return DEFAULT_NAMESPACE;
  }

  return normalized;
};

const getStorageKey = (namespace?: string): string =>
  `${STORAGE_PREFIX}${resolveNamespace(namespace)}`;

const parseUsage = (value: unknown): CommandUsage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as { count?: unknown; lastUsedAt?: unknown };
  const parsedCount = typeof parsed.count === "number" ? parsed.count : Number.NaN;

  if (!Number.isFinite(parsedCount) || parsedCount <= 0 || typeof parsed.lastUsedAt !== "string") {
    return null;
  }

  if (Number.isNaN(Date.parse(parsed.lastUsedAt))) {
    return null;
  }

  return {
    count: Math.trunc(parsedCount),
    lastUsedAt: parsed.lastUsedAt,
  };
};

const normalizeLoadedState = (rawState: unknown): RecentsState => {
  if (!rawState || typeof rawState !== "object") {
    return EMPTY_RECENTS;
  }

  const parsed = rawState as { version?: unknown; used?: unknown };
  if (parsed.version !== 1 || !parsed.used || typeof parsed.used !== "object") {
    return EMPTY_RECENTS;
  }

  const normalizedUsed: RecentsState["used"] = {};
  for (const [commandId, usage] of Object.entries(parsed.used as Record<string, unknown>)) {
    if (!commandId) {
      continue;
    }

    const normalizedUsage = parseUsage(usage);
    if (!normalizedUsage) {
      continue;
    }

    normalizedUsed[commandId] = normalizedUsage;
  }

  return {
    version: 1,
    used: normalizedUsed,
  };
};

const saveRecents = (namespace: string, state: RecentsState): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(namespace), JSON.stringify(state));
  } catch {
    // Ignore write failures to avoid blocking command execution.
  }
};

export const loadRecents = (namespace: string): RecentsState => {
  if (!canUseLocalStorage()) {
    return EMPTY_RECENTS;
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(namespace));
    if (!rawValue) {
      return EMPTY_RECENTS;
    }

    return normalizeLoadedState(JSON.parse(rawValue));
  } catch {
    return EMPTY_RECENTS;
  }
};

export const recordUse = (namespace: string, commandId: CommandId): void => {
  const nextNamespace = resolveNamespace(namespace);
  const current = loadRecents(nextNamespace);
  const currentUsage = current.used[commandId];
  const nextCount = Math.max(0, currentUsage?.count ?? 0) + 1;

  const nextState: RecentsState = {
    version: 1,
    used: {
      ...current.used,
      [commandId]: {
        count: nextCount,
        lastUsedAt: new Date().toISOString(),
      },
    },
  };

  saveRecents(nextNamespace, nextState);
};

export const getFrecency = (namespace: string, commandId: CommandId): CommandUsage | null => {
  const current = loadRecents(namespace);
  return current.used[commandId] ?? null;
};
