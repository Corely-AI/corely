import { describe, expect, it } from "vitest";
import { CollectInputsToolInputSchema } from "../collect-inputs.schema";

describe("CollectInputsToolInputSchema", () => {
  it("accepts a repeater field with itemFields", () => {
    const payload = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          minItems: 1,
          itemFields: [
            { key: "description", label: "Description", type: "text" },
            { key: "quantity", label: "Quantity", type: "number" },
          ],
          ui: { layout: "table" },
        },
      ],
    };

    const parsed = CollectInputsToolInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("rejects repeater fields without itemFields", () => {
    const payload = {
      title: "Collect items",
      fields: [{ key: "items", label: "Items", type: "repeater" }],
    };

    const parsed = CollectInputsToolInputSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects nested repeaters", () => {
    const payload = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          itemFields: [
            {
              key: "nested",
              label: "Nested",
              type: "repeater",
              itemFields: [{ key: "name", label: "Name", type: "text" }],
            },
          ],
        },
      ],
    };

    const parsed = CollectInputsToolInputSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects repeater fields with maxItems below minItems", () => {
    const payload = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          minItems: 3,
          maxItems: 2,
          itemFields: [{ key: "name", label: "Name", type: "text" }],
        },
      ],
    };

    const parsed = CollectInputsToolInputSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
