import { describe, expect, it } from "vitest";
import type { SignLayout } from "@corely/contracts";
import { hasRequiredSignatures, nextTemplateRevision } from "../domain/template-revision";

const layout: SignLayout = {
  schemaVersion: 1,
  document: { id: "original", sha256: "a".repeat(64), pageCount: 1 },
  roles: [{ id: "client", name: "Client" }],
  fields: [],
};
const draft = { templateId: "template", title: "Agreement", layout, revision: 1, archived: false };

describe("template revisions", () => {
  it("creates the first revision and rejects a stale write", () => {
    expect(nextTemplateRevision(draft.templateId, null, 0, draft)).toEqual({ draft });
    expect(nextTemplateRevision(draft.templateId, draft, 0, draft)).toHaveProperty("conflict");
  });
  it("archives the current snapshot and prevents subsequent changes", () => {
    const archived = { ...draft, revision: 2, archived: true };
    expect(nextTemplateRevision(draft.templateId, draft, 1, null)).toEqual({ draft: archived });
    expect(nextTemplateRevision(draft.templateId, archived, 2, draft)).toHaveProperty("conflict");
  });
  it("requires a signature field before a role can be published", () => {
    expect(hasRequiredSignatures(layout)).toBe(false);
  });
});
