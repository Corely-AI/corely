import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { Card, CardHeader, CardTitle, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { useReactToPrint } from "react-to-print";

export function VatPeriodDetailsPage() {
  const uiCopy = useUiCopy("ui.tax-vatperioddetailspage");
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vat-period-details", key],
    queryFn: () => taxApi.getVatPeriodDetails(key!),
    enabled: !!key,
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `VAT Return ${key}`,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center text-muted-foreground">{uiCopy("period-not-found")}</div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          {uiCopy("go-back")}
        </Button>
      </div>
    );
  }

  const sales = data.rows.filter((row) => row.sourceType !== "EXPENSE");
  const purchases = data.rows.filter((row) => row.sourceType === "EXPENSE");
  const payableVat = data.taxDueCents;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {uiCopy("vat-return") + " "}
            {data.periodKey}
          </h1>
          <p className="text-muted-foreground">{uiCopy("detailed-breakdown-of-sales")}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {uiCopy("print-pdf")}
          </Button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6 print:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {uiCopy("total-sales-vat-collected")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(data.salesVatCents, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                {uiCopy("on") + " "}
                {formatMoney(data.salesNetCents, "EUR")}
                {" " + uiCopy("net-sales")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {uiCopy("total-input-vat-deductible")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(data.purchaseVatCents, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                {uiCopy("on") + " "}
                {formatMoney(data.purchaseNetCents, "EUR")}
                {" " + uiCopy("net-purchases")}
              </p>
            </CardContent>
          </Card>
          <Card
            className={
              payableVat > 0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {uiCopy("net-payable")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(payableVat, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                {payableVat > 0 ? uiCopy("to-be-paid-to") : uiCopy("refundable-from-tax-office")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{uiCopy("sales-output-vat")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-muted-foreground text-sm">{uiCopy("no-sales-records-in")}</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3">{uiCopy("date")}</th>
                      <th className="px-4 py-3">{uiCopy("number")}</th>
                      <th className="px-4 py-3">{uiCopy("customer")}</th>
                      <th className="px-4 py-3 text-right">{uiCopy("net")}</th>
                      <th className="px-4 py-3 text-right">VAT</th>
                      <th className="px-4 py-3 text-right">{uiCopy("gross")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((item: any, index: number) => (
                      <tr
                        key={item.id || `sale-${index}`}
                        className="bg-background border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.dateUsed).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.displayNumber || "—"}</td>
                        <td className="px-4 py-3">{item.customer || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.netAmountCents, "EUR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.taxAmountCents, "EUR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.grossAmountCents, "EUR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{uiCopy("purchases-input-vat")}</CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-muted-foreground text-sm">{uiCopy("no-purchase-records-in")}</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3">{uiCopy("date")}</th>
                      <th className="px-4 py-3">{uiCopy("merchant")}</th>
                      <th className="px-4 py-3 text-right">{uiCopy("net")}</th>
                      <th className="px-4 py-3 text-right">VAT</th>
                      <th className="px-4 py-3 text-right">{uiCopy("gross")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((item: any, index: number) => (
                      <tr
                        key={item.id || `purchase-${index}`}
                        className="bg-background border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(item.dateUsed).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">{item.customer || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.netAmountCents, "EUR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.taxAmountCents, "EUR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.grossAmountCents, "EUR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
