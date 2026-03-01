// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { useRotatingStatusText } from "./useRotatingStatusText";

type HarnessProps = {
  enabled: boolean;
  phase?: "initial" | "short" | "long" | "tool";
  minIntervalMs?: number;
  maxIntervalMs?: number;
};

const TestHarness = ({ enabled, phase, minIntervalMs, maxIntervalMs }: HarnessProps) => {
  const { text, phase: activePhase } = useRotatingStatusText({
    enabled,
    phase,
    tone: "calm",
    minIntervalMs,
    maxIntervalMs,
    random: () => 0,
  });
  return (
    <div data-phase={activePhase ?? ""} data-text={text ?? ""}>
      {text}
    </div>
  );
};

describe("useRotatingStatusText", () => {
  it("shows initial text immediately", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<TestHarness enabled />);
    });

    expect(container.textContent).toBe("Thinking…");
    vi.useRealTimers();
  });

  it("switches phases at ~2s and ~6s", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<TestHarness enabled />);
    });

    const node = container.querySelector("div");
    expect(node?.dataset.phase).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(node?.dataset.phase).toBe("short");

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(node?.dataset.phase).toBe("long");

    vi.useRealTimers();
  });

  it("rotates without repeating immediately", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<TestHarness enabled phase="short" minIntervalMs={10} maxIntervalMs={10} />);
    });

    const firstText = container.textContent;
    act(() => {
      vi.advanceTimersByTime(10);
    });
    const secondText = container.textContent;

    expect(firstText).toBeTruthy();
    expect(secondText).toBeTruthy();
    expect(secondText).not.toBe(firstText);

    vi.useRealTimers();
  });

  it("stops and clears when disabled", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<TestHarness enabled minIntervalMs={10} maxIntervalMs={10} />);
    });

    act(() => {
      root.render(<TestHarness enabled={false} />);
    });

    expect(container.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(container.textContent).toBe("");
    vi.useRealTimers();
  });
});
