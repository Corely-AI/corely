import React from "react";
import { Route } from "react-router-dom";
import {
  CatalogItemsPage,
  CatalogItemEditorPage,
  CatalogUomsPage,
  CatalogTaxProfilesPage,
  CatalogCategoriesPage,
  PosCatalogLookupPage,
  PosQuickCatalogItemPage,
} from "../../modules/catalog";
import { RequireCapability } from "@corely/web-shared/shared/workspaces/RequireCapability";
import { RequirePermission, RequireSurface } from "@corely/web-shared/shared/permissions";

export const catalogRoutes = (
  <>
    <Route
      path="/catalog/items"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogItemsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/items/new"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogItemEditorPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/items/:id"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogItemEditorPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/items/:id/edit"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogItemEditorPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/uoms"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogUomsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/tax-profiles"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogTaxProfilesPage />
        </RequireCapability>
      }
    />
    <Route
      path="/catalog/categories"
      element={
        <RequireCapability capability="catalog.basic">
          <CatalogCategoriesPage />
        </RequireCapability>
      }
    />
    <Route
      path="/pos/catalog"
      element={
        <RequireSurface surfaces={["pos"]}>
          <RequireCapability capability="catalog.basic">
            <RequirePermission permission="catalog.read">
              <PosCatalogLookupPage />
            </RequirePermission>
          </RequireCapability>
        </RequireSurface>
      }
    />
    <Route
      path="/pos/catalog/new"
      element={
        <RequireSurface surfaces={["pos"]}>
          <RequireCapability capability="catalog.basic">
            <RequirePermission permission="catalog.quickwrite">
              <PosQuickCatalogItemPage />
            </RequirePermission>
          </RequireCapability>
        </RequireSurface>
      }
    />
    <Route
      path="/pos/catalog/:id/edit"
      element={
        <RequireSurface surfaces={["pos"]}>
          <RequireCapability capability="catalog.basic">
            <RequirePermission permission="catalog.quickwrite">
              <PosQuickCatalogItemPage />
            </RequirePermission>
          </RequireCapability>
        </RequireSurface>
      }
    />
  </>
);
