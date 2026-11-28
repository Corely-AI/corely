import type { Location } from "react-router-dom";

export function getReturnPath(state: { from?: Partial<Location> } | null, fallback: string) {
  const from = state?.from;
  if (
    typeof from?.pathname !== "string" ||
    !from.pathname.startsWith("/") ||
    from.pathname.startsWith("//") ||
    from.pathname.includes("\\")
  ) {
    return fallback;
  }
  return from.pathname + (from.search ?? "") + (from.hash ?? "");
}
