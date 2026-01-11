// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { QuestionForm } from "./QuestionForm";
import type { CollectInputsToolInput, CollectInputsToolOutput } from "@corely/contracts";

const findButtonByLabel = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) => button.textContent === label);

describe("QuestionForm repeater", () => {
  it("submits repeater values", () => {
    const request: CollectInputsToolInput = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          minItems: 1,
          itemFields: [
            { key: "description", label: "Description", type: "text", required: true },
            { key: "quantity", label: "Quantity", type: "number" },
          ],
        },
      ],
    };

    let submitted: CollectInputsToolOutput | undefined;
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<QuestionForm request={request} onSubmit={(output) => (submitted = output)} />);
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    expect(inputs).toHaveLength(2);

    act(() => {
      inputs[0].value = "Widget";
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    });

    act(() => {
      inputs[1].value = "2";
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitButton = findButtonByLabel(container, "Submit");
    act(() => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(submitted?.values.items).toEqual([
      {
        description: "Widget",
        quantity: 2,
      },
    ]);
  });

  it("adds and removes repeater rows", () => {
    const request: CollectInputsToolInput = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          minItems: 1,
          itemFields: [{ key: "name", label: "Name", type: "text" }],
        },
      ],
    };

    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<QuestionForm request={request} onSubmit={() => undefined} />);
    });

    expect(container.querySelectorAll("input")).toHaveLength(1);

    const addButton = findButtonByLabel(container, "Add row");
    act(() => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelectorAll("input")).toHaveLength(2);

    const removeButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent === "Remove"
    );
    act(() => {
      removeButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelectorAll("input")).toHaveLength(1);
  });
});
