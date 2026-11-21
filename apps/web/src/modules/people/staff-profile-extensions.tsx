import { StaffProfilePage as SharedStaffProfilePage } from "@corely/web-features/modules/people";
import type { StaffProfileGuidanceRegistration } from "@corely/people-ui";

const staffProfileGuidance: readonly StaffProfileGuidanceRegistration[] = [];

export function StaffProfilePage() {
  return <SharedStaffProfilePage guidance={staffProfileGuidance} />;
}
