export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

export const parseCommaList = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const joinCommaList = (values?: string[] | null): string => {
  if (!values || values.length === 0) {
    return "";
  }
  return values.join(", ");
};

export const parseJsonRecord = (value?: string | null): Record<string, string> | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Ensure all values are strings
      const record: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed)) {
        record[key] = String(val);
      }
      return record;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export const formatJson = (value?: unknown): string => {
  if (!value) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

export const emptyToUndefined = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const emptyToNull = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const parseOptionalNumber = (value: string | number | null | undefined): number | null => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
