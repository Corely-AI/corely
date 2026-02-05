export type JsonFieldState = {
  status: "empty" | "valid" | "invalid";
  parsed: unknown | null;
  error: string | null;
  preview: string | null;
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getJsonFieldState = (value: string): JsonFieldState => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { status: "empty", parsed: null, error: null, preview: null };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return {
        status: "valid",
        parsed,
        error: null,
        preview: `Array with ${parsed.length} item${parsed.length === 1 ? "" : "s"}`,
      };
    }
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed as Record<string, unknown>);
      const sample = keys.slice(0, 5).join(", ");
      return {
        status: "valid",
        parsed,
        error: null,
        preview: keys.length ? `Keys: ${sample}${keys.length > 5 ? " +more" : ""}` : "Empty object",
      };
    }
    return {
      status: "valid",
      parsed,
      error: null,
      preview: `Value type: ${typeof parsed}`,
    };
  } catch (error) {
    return {
      status: "invalid",
      parsed: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
      preview: null,
    };
  }
};

const getJsonObject = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed);
    return isPlainObject(parsed) ? { ...parsed } : {};
  } catch {
    return {};
  }
};

export const updateJsonString = (
  current: string,
  updater: (draft: Record<string, unknown>) => void
) => {
  const draft = getJsonObject(current);
  updater(draft);
  const keys = Object.keys(draft);
  if (keys.length === 0) {
    return "";
  }
  return JSON.stringify(draft, null, 2);
};

export const setStringField = (
  obj: Record<string, unknown>,
  key: string,
  value: string | undefined
) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    delete obj[key];
    return;
  }
  obj[key] = trimmed;
};

export const setNestedStringField = (
  obj: Record<string, unknown>,
  path: string[],
  value: string | undefined
) => {
  const trimmed = value?.trim() ?? "";
  const parents: Array<{ obj: Record<string, unknown>; key: string }> = [];
  let cursor: Record<string, unknown> = obj;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const next = cursor[key];
    if (!isPlainObject(next)) {
      cursor[key] = {};
    }
    parents.push({ obj: cursor, key });
    cursor = cursor[key] as Record<string, unknown>;
  }

  const leaf = path[path.length - 1];
  if (!trimmed) {
    delete cursor[leaf];
    for (let index = parents.length - 1; index >= 0; index -= 1) {
      const { obj: parent, key } = parents[index];
      const child = parent[key];
      if (isPlainObject(child) && Object.keys(child).length === 0) {
        delete parent[key];
      } else {
        break;
      }
    }
    return;
  }

  cursor[leaf] = trimmed;
};

export const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

export const getNestedStringField = (value: unknown, path: string[]) => {
  let cursor: unknown = value;
  for (const key of path) {
    if (!isPlainObject(cursor) || !(key in cursor)) {
      return "";
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return getStringField(cursor);
};

export const formatJsonInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};
