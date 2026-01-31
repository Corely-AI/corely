import { beforeEach, describe, expect, it } from "vitest";
import { CreatePropertyUseCase } from "../create-property.usecase";
import { FakePropertyRepo } from "../../../testkit/fakes/fake-property-repo";
import { NoopLogger, unwrap, isErr } from "@corely/kernel";

describe("CreatePropertyUseCase", () => {
  let propertyRepo: FakePropertyRepo;
  let useCase: CreatePropertyUseCase;

  beforeEach(() => {
    propertyRepo = new FakePropertyRepo();
    useCase = new CreatePropertyUseCase({
      propertyRepo,
      logger: new NoopLogger(),
    } as any);
  });

  it("successfully creates a property", async () => {
    const result = await useCase.execute(
      {
        name: "Beautiful Villa",
        slug: "beautiful-villa",
        maxGuests: 4,
      },
      { tenantId: "tenant-1", workspaceId: "ws-1" }
    );

    const property = unwrap(result);
    expect(property.name).toBe("Beautiful Villa");
    expect(property.slug).toBe("beautiful-villa");
    expect(property.status).toBe("DRAFT");
    expect(propertyRepo.properties).toHaveLength(1);
  });

  it("fails if slug already exists", async () => {
    await propertyRepo.save("tenant-1", "ws-1", {
      name: "Existing Villa",
      slug: "existing-villa",
    });

    const result = await useCase.execute(
      {
        name: "Another Villa",
        slug: "existing-villa",
      },
      { tenantId: "tenant-1", workspaceId: "ws-1" }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("already exists");
    }
  });
});
