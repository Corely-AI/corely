import React from "react";
import { IncomeTaxReturnPage } from "./screens/income-tax-return-page";

export type TaxRouteConfig = {
  path: string;
  element: React.ReactElement;
};

export const taxRoutes: TaxRouteConfig[] = [
  {
    path: "/tax/return",
    element: <IncomeTaxReturnPage />,
  },
];
