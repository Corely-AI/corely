import { describe, expect, it, vi } from "vitest";
import { ListExpensesUseCase } from "../list-expenses.usecase";

describe("ListExpensesUseCase custom attributes filters", () => {
  it("returns empty result when dimension filter resolves no IDs", async () => {
    const repo = {
      list: vi.fn(),
    } as any;
    const resolveByDimensions = {
      execute: vi.fn().mockResolvedValue([]),
    } as any;
    const resolveByCustomFields = {
      execute: vi.fn(),
    } as any;

    const useCase = new ListExpensesUseCase(repo, resolveByDimensions, resolveByCustomFields);

    const result = await useCase.execute(
      {
        page: 1,
        pageSize: 20,
        dimensionFilters: [{ typeId: "type-1", valueIds: ["value-1"] }],
      } as any,
      { tenantId: "tenant-1" } as any
    );

    expect(result.items).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it("intersects dimension and custom field resolved IDs before querying repo", async () => {
    const repo = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0, nextCursor: null }),
    } as any;
    const resolveByDimensions = {
      execute: vi.fn().mockResolvedValue(["exp-1", "exp-2", "exp-3"]),
    } as any;
    const resolveByCustomFields = {
      execute: vi.fn().mockResolvedValue(["exp-2", "exp-3"]),
    } as any;

    const useCase = new ListExpensesUseCase(repo, resolveByDimensions, resolveByCustomFields);

    await useCase.execute(
      {
        page: 1,
        pageSize: 20,
        dimensionFilters: [{ typeId: "type-1", valueIds: ["value-1"] }],
        customFieldFilters: [{ fieldId: "field-1", operator: "eq", value: "A" }],
      } as any,
      { tenantId: "tenant-1" } as any
    );

    expect(repo.list).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ entityIds: ["exp-2", "exp-3"] }),
      expect.any(Object)
    );
  });
});
