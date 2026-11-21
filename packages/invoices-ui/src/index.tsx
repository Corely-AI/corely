import { createContext, useContext, type ComponentType } from "react";

export type InvoiceDraftGuidance = ComponentType;

const InvoiceDraftGuidanceContext = createContext<ReadonlyMap<string, InvoiceDraftGuidance>>(
  new Map()
);

export const InvoiceDraftGuidanceProvider = InvoiceDraftGuidanceContext.Provider;

export function InvoiceDraftGuidanceSlot({ workspaceId }: { workspaceId: string | undefined }) {
  const guidance = useContext(InvoiceDraftGuidanceContext);
  const Guidance = workspaceId ? guidance.get(workspaceId) : undefined;
  return Guidance ? <Guidance /> : null;
}
