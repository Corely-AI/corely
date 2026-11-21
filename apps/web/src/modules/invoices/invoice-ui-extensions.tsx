import { InvoiceDraftGuidanceProvider, type InvoiceDraftGuidance } from "@corely/invoices-ui";
import type { ReactNode } from "react";

// Self-host builds register guidance by stable workspace ID.
const draftGuidance: ReadonlyMap<string, InvoiceDraftGuidance> = new Map();

export function InvoiceUiExtensions({ children }: { children: ReactNode }) {
  return (
    <InvoiceDraftGuidanceProvider value={draftGuidance}>{children}</InvoiceDraftGuidanceProvider>
  );
}
