import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "../infrastructure/tools/tool-registry";
import type { DomainToolPort } from "../application/ports/domain-tool.port";
import type { TenantEntitlementsReadPort } from "@corely/kernel";

const mockTool = (name: string, appId?: string): DomainToolPort => ({
  name,
  description: `${name} description`,
  appId,
  kind: "server",
  inputSchema: z.object({}),
});

describe("ToolRegistry", () => {
  it("returns all tools when entitlement reader is unavailable", async () => {
    const registry = new ToolRegistry([mockTool("invoice_list", "invoices"), mockTool("helper")]);

    const tools = await registry.listForTenant("tenant-1");

    expect(tools.map((tool) => tool.name)).toEqual(["invoice_list", "helper"]);
  });

  it("filters tools by enabled apps while preserving global tools", async () => {
    const entitlementsRead: TenantEntitlementsReadPort = {
      getAppEnablementMap: vi.fn(async () => ({
        invoices: true,
        sales: false,
        classes: true,
      })),
      isAppEnabled: vi.fn(async () => true),
    };

    const registry = new ToolRegistry(
      [
        [
          mockTool("invoice_list", "invoices"),
          mockTool("sales_createQuoteFromText", "sales"),
          mockTool("classes_getTeacherDashboardSummary", "classes"),
        ],
        [mockTool("collect_helper")],
      ],
      entitlementsRead
    );

    const tools = await registry.listForTenant("tenant-1");

    expect(tools.map((tool) => tool.name)).toEqual([
      "invoice_list",
      "classes_getTeacherDashboardSummary",
      "collect_helper",
    ]);
  });

  it("falls back to all tools when entitlement resolution fails", async () => {
    const entitlementsRead: TenantEntitlementsReadPort = {
      getAppEnablementMap: vi.fn(async () => {
        throw new Error("unavailable");
      }),
      isAppEnabled: vi.fn(async () => true),
    };

    const registry = new ToolRegistry(
      [mockTool("invoice_list", "invoices"), mockTool("sales_createQuoteFromText", "sales")],
      entitlementsRead
    );

    const tools = await registry.listForTenant("tenant-1");

    expect(tools.map((tool) => tool.name)).toEqual(["invoice_list", "sales_createQuoteFromText"]);
  });

  it("allows only freelancer-approved app scopes when active app is freelancer", async () => {
    const registry = new ToolRegistry([
      mockTool("invoice_list", "invoices"),
      mockTool("expenses_list", "expenses"),
      mockTool("assistant_helper", "assistant"),
      mockTool("portfolio_list_showcases", "portfolio"),
      mockTool("crm_createPartyFromText", "crm"),
      mockTool("sales_createQuoteFromText", "sales"),
      mockTool("collect_helper"),
    ]);

    const tools = await registry.listForTenant("tenant-1", "freelancer");

    expect(tools.map((tool) => tool.name)).toEqual([
      "invoice_list",
      "expenses_list",
      "assistant_helper",
      "portfolio_list_showcases",
      "collect_helper",
    ]);
  });

  it("allows freelancer-scope tools in assistant context even when app entitlements are false", async () => {
    const entitlementsRead: TenantEntitlementsReadPort = {
      getAppEnablementMap: vi.fn(async () => ({
        invoices: true,
        expenses: false,
        assistant: true,
        portfolio: false,
      })),
      isAppEnabled: vi.fn(async () => true),
    };

    const registry = new ToolRegistry(
      [
        mockTool("invoice_list", "invoices"),
        mockTool("expenses_list", "expenses"),
        mockTool("assistant_helper", "assistant"),
        mockTool("portfolio_list_showcases", "portfolio"),
        mockTool("crm_createPartyFromText", "crm"),
        mockTool("collect_helper"),
      ],
      entitlementsRead
    );

    const tools = await registry.listForTenant("tenant-1", "assistant");

    expect(tools.map((tool) => tool.name)).toEqual([
      "invoice_list",
      "expenses_list",
      "assistant_helper",
      "portfolio_list_showcases",
      "collect_helper",
    ]);
  });
});
