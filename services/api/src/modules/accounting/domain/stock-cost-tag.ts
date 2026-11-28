export const AUTO_COGS_TAG = "auto-cogs";

export function hasStockCostTag(
  lines: ReadonlyArray<{ tags?: readonly string[] | null }>
): boolean {
  return lines.some((line) => line.tags?.includes(AUTO_COGS_TAG));
}
