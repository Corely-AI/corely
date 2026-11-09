import React, { useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import {
  WorkspaceCapabilitiesSchema,
  type AppLaunchId,
  type WorkspaceConfig,
} from "@corely/contracts";
import { Button, Input } from "@corely/ui";
import { SessionProviders } from "../../src/session/session-provider";
import { FocusedAppShell } from "../../src/layout/focused-app-shell";
import type { FocusedShellLocale } from "../../src/layout/focused-shell-copy";

export function shellConfig(app: AppLaunchId): WorkspaceConfig {
  const invoice = app === "invoice";
  return {
    launchId: app,
    workspaceId: "synthetic-workspace",
    surfaceId: "platform",
    kind: "COMPANY",
    capabilities: WorkspaceCapabilitiesSchema.parse(
      Object.fromEntries(Object.keys(WorkspaceCapabilitiesSchema.shape).map((key) => [key, true]))
    ),
    terminology: {
      partyLabel: "Customer",
      partyLabelPlural: "Customers",
      invoiceLabel: "Invoice",
      invoiceLabelPlural: "Invoices",
      quoteLabel: "Quote",
      quoteLabelPlural: "Quotes",
      projectLabel: "Project",
      projectLabelPlural: "Projects",
      expenseLabel: "Expense",
      expenseLabelPlural: "Expenses",
    },
    navigation: {
      groups: [
        {
          id: invoice ? "invoices" : "people",
          labelKey: "",
          defaultLabel: invoice ? "Invoice" : "Team",
          order: 1,
          items: [
            {
              id: invoice ? "invoices" : "people-directory",
              label: invoice ? "Invoices" : "Staff directory",
              route: invoice ? "/invoices" : "/people/staff",
              icon: invoice ? "FileText" : "Users",
              section: invoice ? "finance" : "team",
              order: 1,
            },
          ],
        },
      ],
    },
    home: { widgets: [] },
    currentUser: { membershipRole: "ADMIN", isWorkspaceAdmin: true },
    computedAt: "2026-11-09T12:00:00Z",
  };
}
function Content({
  app,
  locale,
  completeLaunchCheck,
}: {
  app: AppLaunchId;
  locale: FocusedShellLocale;
  completeLaunchCheck?: () => void;
}) {
  const [note, setNote] = useState("");
  const location = useLocation();
  const invoice = app === "invoice";
  return (
    <FocusedAppShell
      app={app}
      routeRoots={invoice ? ["/invoices", "/audit"] : ["/people"]}
      locale={locale}
      label={invoice ? "Invoice" : "HR"}
      appCenterOrigin="http://localhost:5186"
      workspace={{ id: "synthetic-workspace", name: "Studio Linden" }}
      workspaces={[
        { id: "synthetic-workspace", name: "Studio Linden" },
        { id: "second-workspace", name: "Second studio" },
      ]}
      onWorkspaceChange={() => {}}
      isDirty={note.length > 0}
      actions={
        invoice
          ? [
              {
                id: "new-invoice",
                label: "New invoice",
                menuItemId: "invoices",
                route: "/invoices/new",
              },
            ]
          : []
      }
    >
      <div className="max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Studio Linden</p>
          <h1 className="mt-1 text-3xl font-semibold">
            {invoice ? "Invoices" : "Staff directory"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {invoice
              ? "Keep customer invoices and follow-up in one place."
              : "Find your team and open the staff details you can access."}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="font-medium">{invoice ? "No invoices yet" : "No staff profiles yet"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Synthetic preview data. Your app’s records appear here.
          </p>
        </div>
        <label className="block max-w-md space-y-2">
          <span className="text-sm font-medium">Unsaved note</span>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Write a note to test the leave warning"
          />
        </label>
        {completeLaunchCheck && (
          <Button variant="outline" onClick={completeLaunchCheck}>
            Complete app access check
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Current route: {location.pathname}</p>
      </div>
    </FocusedAppShell>
  );
}
export function FocusedShellFixture() {
  const query = new URLSearchParams(location.search);
  const app = query.get("app") === "hr" ? "hr" : "invoice";
  const locale = query.get("locale") === "de" ? "de" : query.get("locale") === "vi" ? "vi" : "en";
  const launchReview = query.get("launchReview") === "true";
  let launchReads = 0;
  let completeLaunchCheck: (() => void) | undefined;
  const fetcher: typeof fetch = async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.includes("/config?")) {
      if (query.get("menu") === "loading") {
        return new Promise<Response>(() => {});
      }
      if (query.get("menu") === "error") {
        return new Response("{}", { status: 400 });
      }
      const config = shellConfig(app);
      if (query.get("menu") === "empty") {
        config.navigation.groups = [];
      }
      return Response.json(config);
    }
    if (url.endsWith("/menu/launches")) {
      if (launchReview && ++launchReads > 1) {
        await new Promise<void>((resolve) => {
          completeLaunchCheck = resolve;
        });
      }
      return Response.json(
        ["invoice", "hr"].map((id) => ({
          appId: id === "invoice" ? "invoices" : "people",
          name: id,
          tier: 1,
          version: "1",
          dependencies: [],
          enabled: true,
          launch: {
            launchId: id,
            surfaceId: "platform",
            displayName: { en: id === "invoice" ? "Invoice" : "HR", de: id, vi: id },
            category: id === "invoice" ? "finance" : "people",
            iconKey: "Users",
            availability: launchReview ? "available" : "coming-soon",
            ...(launchReview ? { url: `http://${id}.localhost:5186/` } : {}),
          },
        }))
      );
    }
    return Response.json({
      csrfToken: "a".repeat(43),
      expiresAt: "2099-01-01T00:00:00Z",
      appKey: app,
      user: {
        userId: "synthetic",
        name: "Alex Morgan",
        email: "alex@example.invalid",
        memberships: [
          { tenantId: "synthetic-tenant", tenantName: "Studio Linden", roleId: "member" },
        ],
      },
    });
  };
  return (
    <SessionProviders
      config={{ appKey: app, tenantId: "synthetic-tenant", workspaceId: "synthetic-workspace" }}
      fetchFn={fetcher}
    >
      <BrowserRouter>
        <Content
          app={app}
          locale={locale}
          completeLaunchCheck={launchReview ? () => completeLaunchCheck?.() : undefined}
        />
      </BrowserRouter>
    </SessionProviders>
  );
}
