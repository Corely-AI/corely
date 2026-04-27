import { describe, expect, it } from "vitest";
import { isExperienceTargetVisible } from "../platform/experience-evaluator";

describe("experience evaluator", () => {
  it("allows compatible surface and vertical combinations", () => {
    expect(
      isExperienceTargetVisible(
        {
          allowedSurfaces: ["pos"],
          allowedVerticals: ["restaurant"],
        },
        {
          surfaceId: "pos",
          verticalId: "restaurant",
        }
      )
    ).toBe(true);
  });

  it("rejects mismatched POS verticals", () => {
    expect(
      isExperienceTargetVisible(
        {
          allowedSurfaces: ["pos"],
          allowedVerticals: ["restaurant"],
        },
        {
          surfaceId: "pos",
          verticalId: "nails",
        }
      )
    ).toBe(false);
  });

  it("requires capabilities and permissions when declared", () => {
    expect(
      isExperienceTargetVisible(
        {
          requiredCapabilities: ["pos.basic"],
          requiredPermissions: ["cash.read"],
        },
        {
          surfaceId: "platform",
          capabilities: ["pos.basic"],
          permissions: ["cash.read"],
        }
      )
    ).toBe(true);

    expect(
      isExperienceTargetVisible(
        {
          requiredCapabilities: ["pos.basic"],
          requiredPermissions: ["cash.read"],
        },
        {
          surfaceId: "platform",
          capabilities: [],
          permissions: ["cash.read"],
        }
      )
    ).toBe(false);
  });
});
