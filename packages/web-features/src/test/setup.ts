import "@corely/web-shared/shared/i18n";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});
