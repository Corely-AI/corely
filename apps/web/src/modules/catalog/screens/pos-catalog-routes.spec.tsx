import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { catalogRoutes } from "@/app/router/catalog-routes";

const requirePermissionMock = vi.fn(
  ({ permission }: { permission: string; children: React.ReactNode }) => (
    <div data-testid="permission-gate" data-permission={permission} />
  )
);

vi.mock("../../index", () => ({
  CatalogItemsPage: () => <div>CatalogItemsPage</div>,
  CatalogItemEditorPage: () => <div>CatalogItemEditorPage</div>,
  CatalogUomsPage: () => <div>CatalogUomsPage</div>,
  CatalogTaxProfilesPage: () => <div>CatalogTaxProfilesPage</div>,
  CatalogCategoriesPage: () => <div>CatalogCategoriesPage</div>,
  PosCatalogLookupPage: () => <div>PosCatalogLookupPage</div>,
  PosQuickCatalogItemPage: () => <div>PosQuickCatalogItemPage</div>,
}));

vi.mock("@corely/web-shared/shared/workspaces/RequireCapability", () => ({
  RequireCapability: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@corely/web-shared/shared/permissions", () => ({
  RequireSurface: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RequirePermission: (props: { permission: string; children: React.ReactNode }) =>
    requirePermissionMock(props),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{catalogRoutes}</Routes>
    </MemoryRouter>
  );

describe("POS catalog route guards", () => {
  afterEach(() => {
    cleanup();
  });

  it("guards the POS catalog lookup with catalog.read", () => {
    renderAt("/pos/catalog");

    expect(screen.getByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "catalog.read"
    );
  });

  it("guards quick add with catalog.quickwrite", () => {
    renderAt("/pos/catalog/new");

    expect(screen.getByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "catalog.quickwrite"
    );
  });

  it("guards quick edit with catalog.quickwrite", () => {
    renderAt("/pos/catalog/item-1/edit");

    expect(screen.getByTestId("permission-gate")).toHaveAttribute(
      "data-permission",
      "catalog.quickwrite"
    );
  });
});
