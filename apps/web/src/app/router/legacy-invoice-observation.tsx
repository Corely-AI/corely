import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { observeFocused } from "@corely/web-shared/session/focused-observation";

export function isLegacyInvoiceEntry(pathname: string): boolean {
  return (
    /^\/(?:sales\/)?invoices(?:\/(?:new|[^/]+(?:\/(?:edit|audit))?))?\/?$/.test(pathname) &&
    !/^\/(?:sales\/)?invoices\/public(?:\/|$)/.test(pathname)
  );
}
/** Counts legacy entry usage, including retained deep links; never records their IDs or queries. */
export function LegacyInvoiceObservation() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (isLegacyInvoiceEntry(pathname)) {
      observeFocused({ surface: "legacy", layer: "browser", event: "legacy-link", outcome: "ok" });
    }
  }, [pathname]);
  return null;
}
