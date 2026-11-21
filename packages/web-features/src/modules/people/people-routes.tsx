import type { StaffProfileGuidanceRegistration } from "@corely/people-ui";
import { PeopleAccessProvider } from "./use-people";
import { PeopleDirectoryPage } from "./people-directory-page";
import { StaffProfilePage } from "./staff-profile-page";
export function PeopleDirectoryRoute() {
  return (
    <PeopleAccessProvider>
      <PeopleDirectoryPage />
    </PeopleAccessProvider>
  );
}
export function StaffProfileRoute({
  guidance,
}: {
  guidance?: readonly StaffProfileGuidanceRegistration[];
} = {}) {
  return (
    <PeopleAccessProvider>
      <StaffProfilePage guidance={guidance} />
    </PeopleAccessProvider>
  );
}
