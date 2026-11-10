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
export function StaffProfileRoute() {
  return (
    <PeopleAccessProvider>
      <StaffProfilePage />
    </PeopleAccessProvider>
  );
}
