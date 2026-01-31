import { beforeEach, describe, expect, it } from "vitest";
import { ListPublicPropertiesUseCase } from "../list-public-properties.usecase";
import { GetPublicPropertyUseCase } from "../get-public-property.usecase";
import { FakePropertyRepo } from "../../../testkit/fakes/fake-property-repo";
import { NoopLogger, unwrap, isErr } from "@corely/kernel";
import { PUBLIC_CONTEXT_METADATA_KEY } from "../../../../shared/public";

describe("Public Rentals Use Cases", () => {
  let propertyRepo: FakePropertyRepo;

  const publicCtx = (tenantId?: string, workspaceId?: string) => ({
    tenantId,
    workspaceId,
    metadata: {
      [PUBLIC_CONTEXT_METADATA_KEY]: {
        workspaceSlug: "acme",
        resolutionMethod: "path",
        publicEnabled: true,
        publicModules: { rentals: true },
      },
    },
  });

  beforeEach(() => {
    propertyRepo = new FakePropertyRepo();
  });

  describe("ListPublicPropertiesUseCase", () => {
    it("lists only published properties for a tenant", async () => {
      await propertyRepo.save("tenant-1", "ws-1", {
        name: "Published 1",
        slug: "pub-1",
        status: "PUBLISHED",
      });
      await propertyRepo.save("tenant-1", "ws-1", {
        name: "Draft 1",
        slug: "draft-1",
        status: "DRAFT",
      });
      await propertyRepo.save("tenant-2", "ws-2", {
        name: "Published Tenant 2",
        slug: "pub-t2",
        status: "PUBLISHED",
      });
      await propertyRepo.save("tenant-1", "ws-2", {
        name: "Published Other Workspace",
        slug: "pub-ws2",
        status: "PUBLISHED",
      });

      const useCase = new ListPublicPropertiesUseCase({
        propertyRepo,
        logger: new NoopLogger(),
      } as any);

      const result = await useCase.execute({}, publicCtx("tenant-1", "ws-1") as any);
      const items = unwrap(result);

      expect(items).toHaveLength(1);
      expect(items[0].slug).toBe("pub-1");
    });

    it("fails if tenantId is missing", async () => {
      const useCase = new ListPublicPropertiesUseCase({
        propertyRepo,
        logger: new NoopLogger(),
      } as any);

      const result = await useCase.execute({}, publicCtx(undefined, "ws-1") as any);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("tenantId or workspaceId");
      }
    });
  });

  describe("GetPublicPropertyUseCase", () => {
    it("returns a published property by slug", async () => {
      await propertyRepo.save("tenant-1", "ws-1", {
        name: "Villa",
        slug: "villa",
        status: "PUBLISHED",
      });

      const useCase = new GetPublicPropertyUseCase({
        propertyRepo,
        logger: new NoopLogger(),
      } as any);

      const result = await useCase.execute({ slug: "villa" }, publicCtx("tenant-1", "ws-1") as any);
      const property = unwrap(result);

      expect(property.slug).toBe("villa");
      expect(property.status).toBe("PUBLISHED");
    });

    it("fails if property is not published", async () => {
      await propertyRepo.save("tenant-1", "ws-1", {
        name: "Draft Villa",
        slug: "draft-villa",
        status: "DRAFT",
      });

      const useCase = new GetPublicPropertyUseCase({
        propertyRepo,
        logger: new NoopLogger(),
      } as any);

      const result = await useCase.execute(
        { slug: "draft-villa" },
        publicCtx("tenant-1", "ws-1") as any
      );
      expect(isErr(result)).toBe(true);
    });

    it("fails if tenantId is incorrect", async () => {
      await propertyRepo.save("tenant-1", "ws-1", {
        name: "Villa",
        slug: "villa",
        status: "PUBLISHED",
      });

      const useCase = new GetPublicPropertyUseCase({
        propertyRepo,
        logger: new NoopLogger(),
      } as any);

      const result = await useCase.execute(
        { slug: "villa" },
        publicCtx("wrong-tenant", "ws-1") as any
      );
      expect(isErr(result)).toBe(true);
    });
  });
});
