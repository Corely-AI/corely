import type { ComponentType } from "react";

export type CustomerCreationGuidance = ComponentType;

export function CustomerCreationGuidanceSlot({
  workspaceId,
  kind,
  guidance,
}: {
  workspaceId?: string;
  kind?: "INDIVIDUAL" | "ORGANIZATION";
  guidance: ReadonlyMap<string, CustomerCreationGuidance>;
}) {
  const Guidance = workspaceId && kind === "ORGANIZATION" ? guidance.get(workspaceId) : undefined;
  return Guidance ? (
    <div className="md:col-span-2">
      <Guidance />
    </div>
  ) : null;
}
