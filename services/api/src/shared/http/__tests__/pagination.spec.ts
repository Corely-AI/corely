import { describe, expect, it } from "vitest";
import { parseListQuery, buildPageInfo } from "../pagination";

describe("pagination", () => {
  describe("parseListQuery", () => {
    it("should parse standard pagination params", () => {
      const result = parseListQuery({ page: "2", pageSize: "20" });
      expect(result).toMatchObject({
        page: 2,
        pageSize: 20,
      });
    });

    it("should handle mixed types", () => {
      const result = parseListQuery({ page: 3, pageSize: 10 });
      expect(result).toMatchObject({
        page: 3,
        pageSize: 10,
      });
    });

    it("should apply defaults", () => {
      const result = parseListQuery({});
      expect(result).toMatchObject({
        page: 1,
        pageSize: 50,
      });
    });

    it("should parse sort", () => {
      const result = parseListQuery({ sort: "name:asc" });
      expect(result.sort).toBe("name:asc");
    });

    it("should parse filters from string", () => {
      const filters = JSON.stringify([{ field: "status", operator: "eq", value: "active" }]);
      const result = parseListQuery({ filters });
      expect(result.filters).toEqual([{ field: "status", operator: "eq", value: "active" }]);
    });

    it("should handle invalid JSON filters gracefully", () => {
      const result = parseListQuery({ filters: "{invalid" });
      expect(result.filters).toEqual([]);
    });

    it("should parse includeArchived", () => {
      expect(parseListQuery({ includeArchived: "true" }).includeArchived).toBe(true);
      expect(parseListQuery({ includeArchived: "false" }).includeArchived).toBe(false);
      expect(parseListQuery({}).includeArchived).toBeUndefined();
    });
  });

  describe("buildPageInfo", () => {
    it("should calculate hasNextPage correctly", () => {
      expect(buildPageInfo(100, 1, 10).hasNextPage).toBe(true);
      expect(buildPageInfo(10, 1, 10).hasNextPage).toBe(false);
      // page 2 of 10 items (pageSize 10) = 20 > 10
      expect(buildPageInfo(10, 2, 10).hasNextPage).toBe(false);
      // page 5 of 100 items (pageSize 10) = 50 < 100
      expect(buildPageInfo(100, 5, 10).hasNextPage).toBe(true);
    });
  });
});
