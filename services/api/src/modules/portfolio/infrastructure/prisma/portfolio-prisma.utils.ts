export type SortDirection = "asc" | "desc";

const parseSortValue = (value: string) => {
  const [field, direction] = value.split(":");
  return { field, direction: direction === "asc" ? "asc" : "desc" } as const;
};

export const resolveSort = (
  sort: string | string[] | undefined,
  allowedFields: string[],
  fallback: { field: string; direction: SortDirection }
): { field: string; direction: SortDirection } => {
  const raw = Array.isArray(sort) ? sort[0] : sort;
  if (!raw) {
    return fallback;
  }
  const parsed = parseSortValue(raw);
  if (!allowedFields.includes(parsed.field)) {
    return fallback;
  }
  return parsed;
};

export const toOrderBy = (
  sort: string | string[] | undefined,
  allowedFields: string[],
  fallback: { field: string; direction: SortDirection }
): Record<string, SortDirection>[] => {
  const resolved = resolveSort(sort, allowedFields, fallback);
  return [{ [resolved.field]: resolved.direction }];
};
