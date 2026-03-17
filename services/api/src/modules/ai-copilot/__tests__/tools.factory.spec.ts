import { describe, expect, it } from "vitest";
import { resolveToolDescription, resolveToolLocale } from "../infrastructure/tools/tools.factory";

describe("tool description localization", () => {
  it("normalizes supported locales", () => {
    expect(resolveToolLocale("de-DE")).toBe("de");
    expect(resolveToolLocale("vi-VN")).toBe("vi");
    expect(resolveToolLocale("en-US")).toBe("en");
    expect(resolveToolLocale("fr-FR")).toBe("en");
    expect(resolveToolLocale(undefined)).toBe("en");
  });

  it("returns the localized description with English fallback", () => {
    const descriptions = {
      en: "Update an open cash entry by reversing the old entry and creating a corrected replacement entry.",
      de: "Aktualisiert einen offenen Kassenbucheintrag, indem der alte Eintrag storniert und ein korrigierter Ersatzeintrag erstellt wird.",
      vi: "Cap nhat mot giao dich so quy dang mo bang cach dao giao dich cu va tao giao dich thay the da chinh sua.",
    };

    expect(resolveToolDescription("fallback", descriptions, "vi-VN")).toBe(descriptions.vi);
    expect(resolveToolDescription("fallback", descriptions, "de-DE")).toBe(descriptions.de);
    expect(resolveToolDescription("fallback", descriptions, "fr-FR")).toBe(descriptions.en);
  });
});
