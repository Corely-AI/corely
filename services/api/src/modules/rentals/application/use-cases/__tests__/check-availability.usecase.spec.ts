import { beforeEach, describe, expect, it } from "vitest";
import { CheckAvailabilityUseCase } from "../check-availability.usecase";
import { FakePropertyRepo } from "../../../testkit/fakes/fake-property-repo";
import { FakeAvailabilityRepo } from "../../../testkit/fakes/fake-availability-repo";
import { NoopLogger, unwrap, isErr } from "@corely/kernel";

describe("CheckAvailabilityUseCase", () => {
  let propertyRepo: FakePropertyRepo;
  let availabilityRepo: FakeAvailabilityRepo;
  let useCase: CheckAvailabilityUseCase;

  beforeEach(() => {
    propertyRepo = new FakePropertyRepo();
    availabilityRepo = new FakeAvailabilityRepo();
    useCase = new CheckAvailabilityUseCase({
      propertyRepo,
      availabilityRepo,
      logger: new NoopLogger(),
    } as any);
  });

  it("returns available if no overlapping blocked ranges", async () => {
    await propertyRepo.save("tenant-1", "ws-1", {
      name: "Villa",
      slug: "villa",
      status: "PUBLISHED",
    });

    const result = await useCase.execute(
      {
        propertySlug: "villa",
        from: "2026-06-01",
        to: "2026-06-10",
      },
      { tenantId: "tenant-1" } as any
    );

    const output = unwrap(result);
    expect(output.isAvailable).toBe(true);
    expect(output.blockedRanges).toHaveLength(0);
  });

  it("returns unavailable if there is an overlapping blocked range", async () => {
    const prop = await propertyRepo.save("tenant-1", "ws-1", {
      name: "Villa",
      slug: "villa",
      status: "PUBLISHED",
    });

    await availabilityRepo.saveRange("tenant-1", "ws-1", prop.id, {
      startDate: new Date("2026-06-05").toISOString() as any,
      endDate: new Date("2026-06-07").toISOString() as any,
      status: "BLOCKED",
      note: null,
    });

    const result = await useCase.execute(
      {
        propertySlug: "villa",
        from: "2026-06-01",
        to: "2026-06-10",
      },
      { tenantId: "tenant-1" } as any
    );

    const output = unwrap(result);
    expect(output.isAvailable).toBe(false);
    expect(output.blockedRanges).toHaveLength(1);
  });

  it("fails if property is not published", async () => {
    await propertyRepo.save("tenant-1", "ws-1", {
      name: "Villa",
      slug: "villa",
      status: "DRAFT",
    });

    const result = await useCase.execute(
      {
        propertySlug: "villa",
        from: "2026-06-01",
        to: "2026-06-10",
      },
      { tenantId: "tenant-1" } as any
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toContain("not found or not published");
    }
  });
});
