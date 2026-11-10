import {
  AppCatalogItemSchema,
  FilterSpecSchema,
  isSafeSsoReturnPath,
  type AppCatalogItem,
} from "@corely/contracts";
import { readWorkspaceHint, workspaceLaunchUrl } from "./workspace-launch";
const idPattern = /^[A-Za-z0-9_-]{1,160}$/;
/** Explicit build/environment cohort. Missing or malformed settings keep legacy behavior. */
export function invoiceLinkMigrationEnabled(flag: unknown, cohort: unknown, workspaceId: string) {
  if (flag !== "true" || typeof cohort !== "string") {
    return false;
  }
  const ids = cohort.split(",").map((value) => value.trim());
  return ids.length > 0 && ids.every((id) => idPattern.test(id)) && ids.includes(workspaceId);
}
/** Only supported staff Invoice routes. Public/customer-token URLs never enter this map. */
export function invoiceLegacyRoute(relative: string, workspaceId: string): string | undefined {
  if (!isSafeSsoReturnPath(relative) || relative.length > 6000) {
    return;
  }
  const url = new URL(relative, "https://legacy.invalid");
  if (url.pathname !== relative.split(/[?#]/)[0]) {
    return;
  }
  const hint = readWorkspaceHint(url.search);
  if (hint.kind === "invalid" || (hint.kind === "requested" && hint.workspaceId !== workspaceId)) {
    return;
  }
  const query = new URLSearchParams();
  if (url.pathname === "/audit") {
    const ids = url.searchParams.getAll("id");
    if (
      url.searchParams.getAll("entity").length !== 1 ||
      url.searchParams.get("entity") !== "invoice" ||
      ids.length !== 1 ||
      !idPattern.test(ids[0])
    ) {
      return;
    }
    query.set("entity", "invoice");
    query.set("id", ids[0]);
  } else if (
    !/^\/invoices(?:\/(?:new|[A-Za-z0-9_-]{1,160})(?:\/edit)?)?$/.test(url.pathname) ||
    url.pathname === "/invoices/new/edit"
  ) {
    return;
  }
  if (url.pathname === "/invoices") {
    for (const key of ["q", "page", "pageSize", "sort"] as const) {
      const values = url.searchParams.getAll(key);
      if (values.length !== 1) {
        continue;
      }
      const value = values[0];
      if (
        key === "q"
          ? value.length <= 200 && [...value].every((character) => character.charCodeAt(0) >= 32)
          : key === "sort"
            ? /^(?:createdAt|issuedAt|dueAt|number|status|totalCents):(asc|desc)$/.test(value)
            : /^[1-9][0-9]{0,5}$/.test(value)
      ) {
        query.set(key, value);
      }
    }
    const filters = url.searchParams.getAll("filters");
    if (filters.length === 1 && filters[0].length <= 3000) {
      try {
        const parsed = FilterSpecSchema.array().max(12).safeParse(JSON.parse(filters[0]));
        const scalar = (value: unknown) =>
          value === null ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          (typeof value === "string" && value.length <= 200);
        if (
          parsed.success &&
          parsed.data.every(
            (filter) =>
              ["status", "number", "issuedAt", "customerPartyId"].includes(filter.field) &&
              (scalar(filter.value) ||
                (Array.isArray(filter.value) &&
                  filter.value.length <= 20 &&
                  filter.value.every(scalar)))
          )
        ) {
          query.set("filters", JSON.stringify(parsed.data));
        }
      } catch {
        /* Malformed list state does not become cross-origin authority. */
      }
    }
  }
  return `${url.pathname}${query.size ? `?${query}` : ""}`;
}
/** Central helper for staff bookmarks/notifications/cards once an authorized catalog is resolved. */
export function buildInvoiceDestinationLink(
  app: AppCatalogItem,
  workspaceId: string,
  legacyRoute: string
): string | undefined {
  const parsed = AppCatalogItemSchema.safeParse(app);
  if (
    !parsed.success ||
    !parsed.data.enabled ||
    parsed.data.appId !== "invoices" ||
    parsed.data.launch?.launchId !== "invoice" ||
    parsed.data.launch.availability !== "available" ||
    !parsed.data.launch.url
  ) {
    return;
  }
  const route = invoiceLegacyRoute(legacyRoute, workspaceId);
  return route ? workspaceLaunchUrl(parsed.data.launch.url, workspaceId, route) : undefined;
}
