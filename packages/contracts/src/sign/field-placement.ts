import type { SignRectangle } from "./layout.schema";

function within(value: number, lower: number, upper: number) {
  return Math.min(upper, Math.max(lower, value));
}

/** Translate a field on its displayed page without changing its dimensions. */
export function moveSignField(rect: SignRectangle, dx: number, dy: number): SignRectangle {
  return {
    ...rect,
    x: within(rect.x + dx, 0, 1 - rect.width),
    y: within(rect.y + dy, 0, 1 - rect.height),
  };
}

/** Adjust the bottom-right corner. Retain smaller dimensions from existing templates. */
export function resizeSignField(rect: SignRectangle, dx: number, dy: number): SignRectangle {
  return {
    ...rect,
    width: within(rect.width + dx, Math.min(rect.width, 0.01), 1 - rect.x),
    height: within(rect.height + dy, Math.min(rect.height, 0.01), 1 - rect.y),
  };
}

export function signFieldPosition(rect: SignRectangle) {
  return {
    left: rect.x * 100 + "%",
    top: rect.y * 100 + "%",
    width: rect.width * 100 + "%",
    height: rect.height * 100 + "%",
  };
}
