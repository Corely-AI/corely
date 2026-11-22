import { describe, expect, it } from "vitest";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";

describe("WorkspaceTemplateService", () => {
  const service = new WorkspaceTemplateService();
  it("provides shared collaboration and approval controls", () => {
    const capabilities = service.getDefaultCapabilities();
    expect(capabilities["workspace.multiUser"]).toBe(true);
    expect(capabilities["workspace.rbac"]).toBe(true);
    expect(capabilities.approvals).toBe(true);
    expect(capabilities["sales.quotes"]).toBe(true);
    expect(capabilities["booking.basic"]).toBe(true);
  });
  it("keeps optional apps outside the shared baseline", () => {
    const apps = service.getDefaultEnabledApps();
    expect(apps).toContain("booking");
    expect(apps).toContain("workspaces");
    expect(apps).not.toContain("sales");
    expect(apps).not.toContain("import");
    expect(service.getDefaultHomeWidgets()[0].widgetType).toBe("quick-actions");
    expect(service.getDefaultTerminology().partyLabel).toBe("Customer");
  });
});
