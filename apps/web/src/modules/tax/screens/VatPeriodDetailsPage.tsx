import React, { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/components/Skeleton";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { formatMoney } from "@/shared/lib/formatters";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { useReactToPrint } from "react-to-print";

export function VatPeriodDetailsPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vat-period-details", key],
    queryFn: () => taxApi.getVatPeriodDetails(key!),
    enabled: !!key,
  });

  const { data: summary } = useQuery({
    queryKey: ["vat-period-summary", key],
    queryFn: () => taxApi.getVatPeriodSummary(key!),
    enabled: !!key,
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
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
        <div className="text-center text-muted-foreground">Period not found</div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const { sales, purchases } = data;
  const period = summary?.summary;

  // Recalculate totals for display matching the details
  const totalSalesNet = sales.reduce((acc: number, i: any) => acc + i.netAmountCents, 0);
  const totalSalesVat = sales.reduce((acc: number, i: any) => acc + i.taxAmountCents, 0);
  const totalSalesGross = sales.reduce((acc: number, i: any) => acc + i.grossAmountCents, 0);

  const totalPurchasesNet = purchases.reduce((acc: number, i: any) => acc + i.netAmountCents, 0);
  const totalPurchasesVat = purchases.reduce((acc: number, i: any) => acc + i.taxAmountCents, 0);
  const totalPurchasesGross = purchases.reduce((acc: number, i: any) => acc + i.grossAmountCents, 0);

  const payableVat = totalSalesVat - totalPurchasesVat;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">VAT Return {key}</h1>
          <p className="text-muted-foreground">
             Detailed breakdown of sales and purchases
          </p>
        </div>
        <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print / PDF
            </Button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6 print:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales VAT (Collected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalSalesVat, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                on {formatMoney(totalSalesNet, "EUR")} net sales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Input VAT (Deductible)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalPurchasesVat, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                on {formatMoney(totalPurchasesNet, "EUR")} net purchases
              </p>
            </CardContent>
          </Card>
          <Card className={payableVat > 0 ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Payable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(payableVat, "EUR")}</div>
              <p className="text-xs text-muted-foreground">
                {payableVat > 0 ? "To be paid to tax office" : "Refundable from tax office"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales (Output VAT)</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
                <p className="text-muted-foreground text-sm">No sales records in this period.</p>
            ) : (
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Number</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3 text-right">Net</th>
                                <th className="px-4 py-3 text-right">VAT</th>
                                <th className="px-4 py-3 text-right">Gross</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((item: any) => (
                                <tr key={item.id} className="bg-background border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{item.number || "—"}</td>
                                    <td className="px-4 py-3">{item.customerName || "—"}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.netAmountCents, "EUR")}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.taxAmountCents, "EUR")}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.grossAmountCents, "EUR")}</td>
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
            <CardTitle>Purchases (Input VAT)</CardTitle>
          </CardHeader>
          <CardContent>
             {purchases.length === 0 ? (
                <p className="text-muted-foreground text-sm">No purchase records in this period.</p>
            ) : (
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Merchant</th>
                                <th className="px-4 py-3 text-right">Net</th>
                                <th className="px-4 py-3 text-right">VAT</th>
                                <th className="px-4 py-3 text-right">Gross</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((item: any) => (
                                <tr key={item.id} className="bg-background border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">{item.merchantName || "—"}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.netAmountCents, "EUR")}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.taxAmountCents, "EUR")}</td>
                                    <td className="px-4 py-3 text-right">{formatMoney(item.grossAmountCents, "EUR")}</td>
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
