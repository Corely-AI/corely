import { describe, expect, it } from "vitest";
import { normalizeCatalogCode, normalizeCatalogSku } from "../domain/catalog-normalization";
import { assertCanArchiveItem } from "../domain/catalog-item.policy";

describe("catalog domain", () => {
  it("normalizes code and sku", () => {
    expect(normalizeCatalogCode(" sku 001 ")).toBe("SKU-001");
    expect(normalizeCatalogSku(" v 1 ")).toBe("V-1");
  });

  it("blocks archive with active variants", () => {
    expect(() => assertCanArchiveItem(1)).toThrowError();
    expect(() => assertCanArchiveItem(0)).not.toThrow();
  });
});
