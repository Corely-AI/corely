import React from "react";
import { useParams } from "react-router-dom";
import { IncomeTaxReturnPage } from "./screens/income-tax-return-page";
import { IncomeStatementChildPage } from "./screens/income-statement-child-page";
import { IncomeStatementPayslipPage } from "./screens/income-statement-payslip-page";

export type TaxRouteConfig = {
  path: string;
  element: React.ReactElement;
};

const IncomeTaxReturnRoute = () => {
  const params = useParams<{ filingId: string; reportId: string }>();
  if (!params.filingId || !params.reportId) {
    return null;
  }

  return <IncomeTaxReturnPage filingId={params.filingId} reportId={params.reportId} />;
};

export const taxRoutes: TaxRouteConfig[] = [
  {
    path: "/tax/return/:filingId/:reportId",
    element: <IncomeTaxReturnRoute />,
  },
  {
    path: "/income-statement/payslip/:year/:partner",
    element: <IncomeStatementPayslipPage />,
  },
  {
    path: "/income-statement/child/:year",
    element: <IncomeStatementChildPage />,
  },
];
