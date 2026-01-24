import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/formatters";
import { Loader2 } from "lucide-react";

import { useNavigate } from "react-router-dom";

export function TaxHistoryCard() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["vat-periods", year],
    queryFn: () =>
      taxApi.listVatPeriods(
        `${year}-01-01`,
        `${year}-12-31`
      ),
  });

  const periods = data?.periods || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Tax History</CardTitle>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this year.</p>
        ) : (
          <div className="space-y-4">
            {periods.map((period) => {
              const start = new Date(period.periodStart);
              // Construct a key like "2025-Q1" for ID if period.id is "computed-2025-Q1"
              // The backend ListVatPeriods returns id: "computed-2025-Q1"
              const key = period.id.replace("computed-", ""); // or just pass the full key if handled
              // Actually backend expects key like "2025-Q1" (VatPeriodResolver format)
              
              const label = `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
              const totalVat = period.totalsByKind?.STANDARD?.taxAmountCents || 0;

              return (
                <div
                  key={period.id}
                  onClick={() => navigate(`/tax/period/${key}`)}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                >
                  <div>
                    <div className="font-medium text-primary">{label}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(period.periodStart).toLocaleDateString()} -{" "}
                      {new Date(period.periodEnd).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatMoney(totalVat, "EUR")}
                    </div>
                    <Badge variant={period.status === "FINALIZED" ? "default" : "outline"}>
                      {period.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
