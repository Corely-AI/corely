import { lazy } from "react";

export const RentalPropertiesPage = lazy(() => import("./screens/RentalPropertiesPage"));
export const RentalPropertyEditorPage = lazy(() => import("./screens/RentalPropertyEditorPage"));
// export const RentalPropertyDetailPage = lazy(() => import("./screens/RentalPropertyDetailPage"));

export * from "./queries";
