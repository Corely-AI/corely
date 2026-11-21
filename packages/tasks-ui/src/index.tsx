import type { ComponentType } from "react";

export type TaskCreationGuidance = ComponentType;

export function TaskCreationGuidanceSlot({
  active,
  Guidance,
}: {
  active: boolean;
  Guidance?: TaskCreationGuidance;
}) {
  return active && Guidance ? <Guidance /> : null;
}
