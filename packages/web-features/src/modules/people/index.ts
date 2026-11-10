export {
  PeopleDirectoryRoute as PeopleDirectoryPage,
  StaffProfileRoute as StaffProfilePage,
} from "./people-routes";

export { StaffSelfService } from "./staff-self-service";
export { StaffLifecycle } from "./staff-lifecycle";
export { StaffJourneyPage } from "./staff-journey-page";
export { createStaffJourneyClient, type StaffJourneyClient } from "./staff-journey-client";

export { PeopleRuntimeProvider } from "./people-runtime";
export { createPeopleApi } from "./people-api";
