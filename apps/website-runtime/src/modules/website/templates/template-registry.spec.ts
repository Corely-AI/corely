import { describe, expect, it } from "vitest";
import { TemplateRegistry } from "./template-registry";

describe("TemplateRegistry", () => {
  it("includes landing.tutoring.v1", () => {
    const template = TemplateRegistry.get("landing.tutoring.v1");
    expect(template).not.toBeNull();
    expect(template?.key).toBe("landing.tutoring.v1");
  });

  it("includes landing.nailstudio.v1", () => {
    const template = TemplateRegistry.get("landing.nailstudio.v1");
    expect(template).not.toBeNull();
    expect(template?.key).toBe("landing.nailstudio.v1");
  });

  it("resolves legacy tutoring template alias", () => {
    const template = TemplateRegistry.get("landing.deutschliebe.v1");
    expect(template).not.toBeNull();
    expect(template?.key).toBe("landing.tutoring.v1");
  });
});
