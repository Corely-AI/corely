import type { StaffDirectoryEntry, StaffProfile } from "@corely/contracts";

export function staffLinkConflict(profile: StaffProfile, profiles: StaffProfile[]): boolean {
  // Archived identities retain their associations for historical interpretation.
  return profiles.some(
    (other) =>
      other.id !== profile.id &&
      (["accountId", "partyId", "resourceId"] as const).some(
        (key) => profile[key] !== null && profile[key] === other[key]
      )
  );
}
export function validManager(profile: StaffProfile, profiles: StaffProfile[]): boolean {
  const visited = new Set([profile.id]);
  let id = profile.managerStaffId;
  while (id) {
    if (visited.has(id)) {
      return false;
    }
    visited.add(id);
    const manager = profiles.find((item) => item.id === id);
    if (!manager || manager.archivedAt) {
      return false;
    }
    id = manager.managerStaffId;
  }
  return true;
}
export function directoryEntry(profile: StaffProfile): StaffDirectoryEntry {
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    displayName: profile.displayName,
    jobTitle: profile.jobTitle,
    team: profile.team,
    location: profile.location,
    managerStaffId: profile.managerStaffId,
    resourceId: profile.resourceId,
    version: profile.version,
    archivedAt: profile.archivedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
