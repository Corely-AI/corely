import type { ComponentType } from "react";

export interface StaffProfileGuidanceRegistration {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly Guidance: ComponentType<{ operation: "create" | "update" }>;
}

export function StaffProfileGuidanceSlot({
  registrations,
  tenantId,
  workspaceId,
  operation,
}: {
  registrations?: readonly StaffProfileGuidanceRegistration[];
  tenantId?: string;
  workspaceId?: string;
  operation: "create" | "update";
}) {
  const Guidance = registrations?.find(
    (entry) => entry.tenantId === tenantId && entry.workspaceId === workspaceId
  )?.Guidance;
  return Guidance ? <Guidance operation={operation} /> : null;
}
