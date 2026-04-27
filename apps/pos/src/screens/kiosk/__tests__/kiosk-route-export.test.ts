import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(__dirname, "../../../../app");
const mainKioskRoute = resolve(appRoot, "(main)/kiosk.tsx");
const kioskRoute = resolve(appRoot, "kiosk/index.tsx");

describe("kiosk routes", () => {
  it("does not use a redirect shim for the tab route", () => {
    const source = readFileSync(mainKioskRoute, "utf8");
    expect(source).toContain('export { default } from "@/screens/kiosk/KioskWelcomeScreen";');
    expect(source).not.toContain("Redirect");
  });

  it("keeps the standalone kiosk route aligned with the shared screen", () => {
    const source = readFileSync(kioskRoute, "utf8");
    expect(source).toContain('export { default } from "@/screens/kiosk/KioskWelcomeScreen";');
  });
});
