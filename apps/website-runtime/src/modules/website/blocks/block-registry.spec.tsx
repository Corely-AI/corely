import { describe, expect, it } from "vitest";
import type { WebsiteBlock } from "@corely/contracts";
import { renderWebsiteBlock } from "./block-registry";

describe("BlockRegistry", () => {
  it("renders hero block without throwing", () => {
    const block: WebsiteBlock = {
      id: "hero-1",
      type: "hero",
      enabled: true,
      props: {},
    };

    expect(() => renderWebsiteBlock(block)).not.toThrow();
    expect(renderWebsiteBlock(block)).not.toBeNull();
  });
});
