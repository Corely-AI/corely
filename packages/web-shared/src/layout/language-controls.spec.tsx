import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguagePicker } from "../shared/components/language-picker";
import { useFocusedLocale } from "../session/use-focused-locale";
import { resolveFocusedLocale } from "../session/focused-locale";

function Harness() {
  const [locale, setLocale] = useFocusedLocale();
  return <LanguagePicker locale={locale} onChange={setLocale} />;
}
afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});
describe("shared language choice", () => {
  it("changes controls and document language immediately and persists across remounts", async () => {
    localStorage.setItem("Corely One ERP-language", "en");
    const user = userEvent.setup();
    const view = render(<Harness />);
    await user.click(screen.getByRole("button", { name: "EN Language" }));
    await user.click(screen.getByRole("menuitem", { name: "Deutsch" }));
    expect(document.documentElement.lang).toBe("de");
    expect(localStorage.getItem("Corely One ERP-language")).toBe("de");
    expect(screen.getByRole("button", { name: "DE Sprache" })).toBeTruthy();
    view.unmount();
    render(<Harness />);
    expect(screen.getByRole("button", { name: "DE Sprache" })).toBeTruthy();
  });
  it("accepts only supported navigation language hints", () => {
    expect(resolveFocusedLocale("en", "en-US", "vi")).toBe("vi");
    expect(resolveFocusedLocale("de", "en-US", "javascript:bad")).toBe("de");
    expect(resolveFocusedLocale("de", "en-US", "pt-PT")).toBe("pt-PT");
    expect(resolveFocusedLocale(null, "pt-PT")).toBe("pt-PT");
  });

  it("keeps an explicit navigation language in sync with the picker", async () => {
    window.history.replaceState({}, "", "/?lang=fr&workspaceId=studio");
    const user = userEvent.setup();
    const view = render(<Harness />);
    await user.click(screen.getByRole("button", { name: "FR Langue" }));
    await user.click(screen.getByRole("menuitem", { name: "Português (Portugal)" }));
    expect(document.documentElement.lang).toBe("pt-PT");
    expect(window.location.search).toBe("?lang=pt-PT&workspaceId=studio");
    view.unmount();
    render(<Harness />);
    expect(screen.getByRole("button", { name: "PT-PT Idioma" })).toBeTruthy();
  });
});
