import { lazy } from "react";

export const RentalPropertiesPage = lazy(() => import("./screens/RentalPropertiesPage"));
export const RentalPropertyEditorPage = lazy(() => import("./screens/RentalPropertyEditorPage"));
export const RentalCategoriesPage = lazy(() => import("./screens/RentalCategoriesPage"));
export const PublicRentalsListScreen = lazy(() => import("./screens/PublicRentalsListScreen"));
export const PublicRentalDetailScreen = lazy(() => import("./screens/PublicRentalDetailScreen"));

export * from "./queries";
