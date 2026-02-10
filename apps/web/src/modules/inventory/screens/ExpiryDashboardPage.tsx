import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Label } from "@corely/ui";
import { Input } from "@corely/ui";
import { inventoryLotsApi } from "@/lib/inventory-lots-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";

export default function ExpiryDashboardPage() {
  const navigate = useNavigate();
  const [daysAhead, setDaysAhead] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: inventoryQueryKeys.lots.expirySummary({ days: daysAhead }),
    queryFn: () => inventoryLotsApi.getExpirySummary({ days: daysAhead }),
  });

  const formatDate = (date: string | null | undefined) => {
    if (!date) {
      return "-";
    }
    return new Date(date).toLocaleDateString();
  };

  const getDaysUntilExpiryColor = (days: number): string => {
    if (days < 0) {
      return "text-red-600 font-semibold";
    }
    if (days <= 7) {
      return "text-orange-600 font-semibold";
    }
    if (days <= 14) {
      return "text-yellow-600";
    }
    return "text-foreground";
  };

  const getDaysUntilExpiryText = (days: number): string => {
    if (days < 0) {
      return `${Math.abs(days)} days ago`;
    }
    if (days === 0) {
      return "Today";
    }
    if (days === 1) {
      return "Tomorrow";
    }
    return `${days} days`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-h1 text-foreground">Expiry Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Monitor expiring and expired inventory lots
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/inventory/lots")}>
          View All Lots
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Days Ahead to Check</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Checking for lots expiring within the next {daysAhead} days
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold">Expired</h2>
              </div>
              <Badge variant="destructive">{data?.totalExpired || 0}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mb-4">Lots that have already expired</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Expiring Soon</h2>
              </div>
              <Badge variant="outline">{data?.totalExpiringSoon || 0}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Lots expiring within {daysAhead} days
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">Loading expiry data...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {data && data.expired.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-red-700">
                    Expired Lots ({data.expired.length})
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-3">Lot Number</th>
                      <th>Product</th>
                      <th>Expiry Date</th>
                      <th>Qty On Hand</th>
                      <th>Days Since Expiry</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expired.map((item) => (
                      <tr key={item.lotId} className="border-t border-border">
                        <td className="py-3 font-medium">{item.lotNumber}</td>
                        <td className="text-muted-foreground">
                          {item.productName || item.productId}
                        </td>
                        <td>{formatDate(item.expiryDate)}</td>
                        <td>
                          <Badge variant="destructive">{item.qtyOnHand}</Badge>
                        </td>
                        <td className={getDaysUntilExpiryColor(item.daysUntilExpiry)}>
                          {getDaysUntilExpiryText(item.daysUntilExpiry)}
                        </td>
                        <td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/inventory/lots/${item.lotId}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {data && data.expiringSoon.length > 0 && (
            <Card className="border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-orange-700">
                    Expiring Soon ({data.expiringSoon.length})
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-3">Lot Number</th>
                      <th>Product</th>
                      <th>Expiry Date</th>
                      <th>Qty On Hand</th>
                      <th>Days Until Expiry</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiringSoon.map((item) => (
                      <tr key={item.lotId} className="border-t border-border">
                        <td className="py-3 font-medium">{item.lotNumber}</td>
                        <td className="text-muted-foreground">
                          {item.productName || item.productId}
                        </td>
                        <td>{formatDate(item.expiryDate)}</td>
                        <td>{item.qtyOnHand}</td>
                        <td className={getDaysUntilExpiryColor(item.daysUntilExpiry)}>
                          {getDaysUntilExpiryText(item.daysUntilExpiry)}
                        </td>
                        <td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/inventory/lots/${item.lotId}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {data && data.expired.length === 0 && data.expiringSoon.length === 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 space-y-4">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">
                      No expired or expiring lots found within the next {daysAhead} days.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
