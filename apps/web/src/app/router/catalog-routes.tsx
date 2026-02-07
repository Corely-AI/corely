import React from "react";
import { Route } from "react-router-dom";
import {
  CatalogItemsPage,
  CatalogItemEditorPage,
  CatalogUomsPage,
  CatalogTaxProfilesPage,
  CatalogCategoriesPage,
} from "../../modules/catalog";
import { RequireCapability } from "../../shared/workspaces/RequireCapability";

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
  </>
);
