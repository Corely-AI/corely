import { describe, expect, it, vi } from "vitest";
import { resolveToolDescription, resolveToolLocale } from "../infrastructure/tools/tools.factory";

import { mockDeep } from "vitest-mock-extended";
import { z } from "zod";
import { buildAiTools } from "../infrastructure/tools/tools.factory";
import type { DomainToolPort } from "../application/ports/domain-tool.port";

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

// Exercise the actual AI SDK callback, including a permission change after exposure.

it("rechecks access for every execution and keeps model selectors out of trusted context", async () => {
  const execute = vi.fn(async () => ({ restricted: "synthetic" }));
  const candidate: DomainToolPort = {
    name: "private_lookup",
    description: "Synthetic private lookup",
    kind: "server",
    inputSchema: z.object({ tenantId: z.string(), workspaceId: z.string() }),
    requiredPermissions: ["people.private.read"],
    execute,
  };
  const deps = mockDeep<Parameters<typeof buildAiTools>[1]>();
  deps.tenantId = "tenant-a";
  deps.workspaceId = "workspace-a";
  deps.userId = "trusted-user";
  deps.runId = "run-a";
  deps.activeAppId = undefined;
  deps.authorize
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("Tool access denied"));
  const tools = buildAiTools([candidate], deps);
  const input = { tenantId: "tenant-b", workspaceId: "workspace-b" };
  await tools.private_lookup.execute!(input, { toolCallId: "call-a", messages: [], context: {} });
  expect(execute).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: "tenant-a",
      workspaceId: "workspace-a",
      userId: "trusted-user",
      input,
    })
  );
  await expect(
    tools.private_lookup.execute!(input, { toolCallId: "call-b", messages: [], context: {} })
  ).rejects.toThrow("Tool access denied");
  expect(deps.authorize).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenCalledOnce();
  expect(deps.audit.write).toHaveBeenCalledOnce();
  expect(deps.toolExecutions.complete).toHaveBeenLastCalledWith(
    "tenant-a",
    "run-a",
    "call-b",
    expect.objectContaining({ status: "failed" })
  );
});
