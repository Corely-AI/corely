import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppCatalogItemSchema } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import {
  buildInvoiceDestinationLink,
  invoiceLinkMigrationEnabled,
} from "@corely/web-shared/session/invoice-links";
import { Button } from "@corely/ui";
const copy = {
  en: {
    message: "Invoice is available in its focused app. You can keep using this page.",
    open: "Open in Invoice",
  },
  de: {
    message: "Rechnungen sind in der eigenen App verfügbar. Diese Seite bleibt nutzbar.",
    open: "In Rechnungen öffnen",
  },
  vi: {
    message: "Bạn có thể mở ứng dụng Hóa đơn hoặc tiếp tục dùng trang này.",
    open: "Mở trong Hóa đơn",
  },
};
export function LegacyInvoiceHandoff({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { pathname, search } = useLocation();
  const { i18n } = useTranslation();
  const enabled = Boolean(
    activeWorkspaceId &&
    user?.activeTenantId &&
    invoiceLinkMigrationEnabled(
      import.meta.env.VITE_CORELY_INVOICE_LINK_MIGRATION,
      import.meta.env.VITE_CORELY_INVOICE_LINK_WORKSPACES,
      activeWorkspaceId
    )
  );
  const launches = useQuery({
    queryKey: ["legacy-invoice-launch", user?.userId, user?.activeTenantId, activeWorkspaceId],
    queryFn: async ({ signal }) =>
      AppCatalogItemSchema.array().parse(
        await apiClient.request(
          "/menu/launches",
          { headers: { "X-Workspace-Id": activeWorkspaceId ?? "" } },
          { workspaceScope: "none", signal }
        )
      ),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: enabled ? 30_000 : false,
  });
  const invoice = launches.data?.find((entry) => entry.appId === "invoices");
  const href =
    enabled && invoice && !launches.isError
      ? buildInvoiceDestinationLink(invoice, activeWorkspaceId ?? "", `${pathname}${search}`)
      : undefined;
  const text =
    copy[i18n.language.startsWith("de") ? "de" : i18n.language.startsWith("vi") ? "vi" : "en"];
  return (
    <>
      {href && (
        <aside
          aria-label={text.open}
          className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4 sm:mx-6"
        >
          <p className="text-sm">{text.message}</p>
          <Button asChild variant="outline">
            <a href={href} referrerPolicy="no-referrer">
              {text.open}
            </a>
          </Button>
        </aside>
      )}
      {children}
    </>
  );
}
