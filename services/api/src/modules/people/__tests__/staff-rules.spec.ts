import { describe, expect, it } from "vitest";
import { StaffProfileSchema, CreateStaffSchema, UpdateStaffPrivateSchema } from "@corely/contracts";
import { directoryEntry, staffLinkConflict, validManager } from "../domain/staff-rules";
const profile = (id: string, fields: object = {}) =>
  StaffProfileSchema.parse({
    id,
    workspaceId: "workspace",
    displayName: "Staff",
    version: 1,
    archivedAt: null,
    createdAt: "2026-11-07T00:00:00Z",
    updatedAt: "2026-11-07T00:00:00Z",
    ...fields,
  });
describe("Staff profile invariants and wire boundaries", () => {
  it("detects cycles several levels deep while permitting an active manager chain", () => {
    const a = profile("a", { managerStaffId: "b" });
    const b = profile("b", { managerStaffId: "c" });
    expect(validManager(a, [b, profile("c")])).toBe(true);
    expect(validManager(a, [b, profile("c", { managerStaffId: "a" })])).toBe(false);
    expect(validManager(a, [b, profile("c", { archivedAt: "2026-11-07T00:00:00Z" })])).toBe(false);
    expect(validManager(profile("a", { managerStaffId: "a" }), [])).toBe(false);
  });
  it("retains unique identity associations on archived profiles without conflicting on nulls", () => {
    const archived = profile("old", {
      accountId: "account",
      partyId: "party",
      resourceId: "resource",
      archivedAt: "2026-11-07T00:00:00Z",
    });
    for (const field of ["accountId", "partyId", "resourceId"] as const)
      expect(staffLinkConflict(profile("new", { [field]: archived[field] }), [archived])).toBe(
        true
      );
    expect(staffLinkConflict(profile("new"), [archived])).toBe(false);
    expect(staffLinkConflict(archived, [archived])).toBe(false);
  });
  it("allowlists neutral fields even if storage gains private or owner-specific data", () => {
    const value = {
      ...profile("staff", { accountId: "secret-account", partyId: "secret-party" }),
      personalEmail: "hidden@example.invalid",
      notes: "hidden",
      fileRefs: ["hidden"],
    };
    expect(JSON.stringify(directoryEntry(value))).not.toMatch(
      /hidden|secret|fileRefs|notes|accountId|partyId/
    );
  });
  it("rejects caller-controlled scope and private/file fields on ordinary profile writes", () => {
    for (const extra of [
      { tenantId: "other" },
      { workspaceId: "other" },
      { notes: "secret" },
      { fileRefs: ["file"] },
    ])
      expect(CreateStaffSchema.safeParse({ displayName: "Staff", ...extra }).success).toBe(false);
    expect(
      UpdateStaffPrivateSchema.safeParse({ version: 0, personalEmail: "invalid" }).success
    ).toBe(false);
    expect(CreateStaffSchema.parse({ displayName: "  Anna  " }).displayName).toBe("Anna");
  });
});
