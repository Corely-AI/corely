import { createContext, useContext, type ComponentType } from "react";

export type DealLossGuidance = ComponentType;

const GuidanceContext = createContext<ReadonlyMap<string, DealLossGuidance>>(new Map());

export const DealLossGuidanceProvider = GuidanceContext.Provider;

export function DealLossGuidanceSlot({ tenantId }: { tenantId: string }) {
  const Guidance = useContext(GuidanceContext).get(tenantId);
  return Guidance ? <Guidance /> : null;
}
