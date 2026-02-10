export const parseSort = (
  sort: string | string[] | undefined,
  allowed: string[],
  fallback: string
) => {
  const sortValue = Array.isArray(sort) ? sort[0] : sort;
  if (!sortValue) {
    return { [fallback]: "desc" as const };
  }
  const [field, direction] = sortValue.split(":");
  if (!allowed.includes(field)) {
    return { [fallback]: "desc" as const };
  }
  return { [field]: direction === "asc" ? "asc" : "desc" } as Record<string, "asc" | "desc">;
};
