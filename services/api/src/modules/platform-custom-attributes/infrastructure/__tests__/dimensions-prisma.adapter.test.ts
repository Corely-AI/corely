import { describe, expect, it, vi } from "vitest";
import { DimensionsPrismaAdapter } from "../dimensions-prisma.adapter";

describe("DimensionsPrismaAdapter", () => {
  it("resolves entity IDs with AND semantics across dimension filters", async () => {
    const prisma = {
      entityDimension: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ entityId: "a" }, { entityId: "b" }])
          .mockResolvedValueOnce([{ entityId: "b" }, { entityId: "c" }]),
      },
    } as any;

    const adapter = new DimensionsPrismaAdapter(prisma);

    const ids = await adapter.resolveEntityIdsByDimensionFilters("tenant-1", "expense", [
      { typeId: "type-1", valueIds: ["v1"] },
      { typeId: "type-2", valueIds: ["v2"] },
    ]);

    expect(ids).toEqual(["b"]);
  });
});
