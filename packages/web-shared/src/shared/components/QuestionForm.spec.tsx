// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "@corely/web-shared/shared/i18n";
import { QuestionForm } from "./QuestionForm";
import type { CollectInputsToolInput, CollectInputsToolOutput } from "@corely/contracts";

const findButtonByLabel = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) => button.textContent === label);

describe("QuestionForm repeater", () => {
  it("submits repeater values", async () => {
    const request: CollectInputsToolInput = {
      title: "Collect items",
      fields: [
        {
          key: "items",
          label: "Items",
          type: "repeater",
          minItems: 1,
          defaultValue: [{ description: "Widget", quantity: 2 }],
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
      root.render(
        <I18nextProvider i18n={i18n}>
          <QuestionForm
            request={request}
            onSubmit={(output) => {
              submitted = output;
            }}
          />
        </I18nextProvider>
      );
    });

    const form = container.querySelector("form");
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
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
      root.render(
        <I18nextProvider i18n={i18n}>
          <QuestionForm request={request} onSubmit={() => undefined} />
        </I18nextProvider>
      );
    });

    expect(container.querySelectorAll("input")).toHaveLength(1);

    const addButton = findButtonByLabel(container, i18n.t("forms.repeater.add"));
    act(() => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelectorAll("input")).toHaveLength(2);

    const removeButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent === i18n.t("forms.repeater.remove")
    );
    act(() => {
      removeButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelectorAll("input")).toHaveLength(1);
  });
});
