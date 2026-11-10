import { isSafeSsoReturnPath } from "@corely/contracts";

/** Restore an internal deep link after legacy sign-in; never accept an external return URL. */
export function authReturnPath(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/";
  }
  const from = state.from;
  if (
    !from ||
    typeof from !== "object" ||
    !("pathname" in from) ||
    typeof from.pathname !== "string"
  ) {
    return "/";
  }
  const search = "search" in from && typeof from.search === "string" ? from.search : "";
  const hash = "hash" in from && typeof from.hash === "string" ? from.hash : "";
  if ((search && !search.startsWith("?")) || (hash && !hash.startsWith("#"))) {
    return "/";
  }
  const path = `${from.pathname}${search}${hash}`;
  return isSafeSsoReturnPath(path) ? path : "/";
}
