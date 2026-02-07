import { lazy } from "react";

export const CatalogItemsPage = lazy(() => import("./screens/CatalogItemsPage"));
export const CatalogItemEditorPage = lazy(() => import("./screens/CatalogItemEditorPage"));
export const CatalogUomsPage = lazy(() => import("./screens/CatalogUomsPage"));
export const CatalogTaxProfilesPage = lazy(() => import("./screens/CatalogTaxProfilesPage"));
export const CatalogCategoriesPage = lazy(() => import("./screens/CatalogCategoriesPage"));

export * from "./queries";
