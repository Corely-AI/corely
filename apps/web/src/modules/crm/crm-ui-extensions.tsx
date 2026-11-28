import { DealLossGuidanceProvider, type DealLossGuidance } from "@corely/crm-ui";
import type { ReactNode } from "react";

const dealLossGuidance: ReadonlyMap<string, DealLossGuidance> = new Map();

export function CrmUiExtensions({ children }: { children: ReactNode }) {
  return <DealLossGuidanceProvider value={dealLossGuidance}>{children}</DealLossGuidanceProvider>;
}
