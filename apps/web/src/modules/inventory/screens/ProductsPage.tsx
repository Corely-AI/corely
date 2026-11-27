import { useTranslation } from "react-i18next";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { TableLoadingSkeleton, Badge } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import type { ProductType } from "@corely/contracts";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";

export default function ProductsPage() {
  const { t } = useTranslation();
  const uiCopy = useUiCopy("ui.inventory-productspage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: inventoryQueryKeys.products.list(),
    queryFn: () => inventoryApi.listProducts(),
  });

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [productType, setProductType] = useState<ProductType>("STOCKABLE");
  const [unitOfMeasure, setUnitOfMeasure] = useState("pcs");

  const createProduct = useMutation({
    mutationFn: () =>
      inventoryApi.createProduct({
        sku,
        name,
        productType,
        unitOfMeasure,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.products.lists() });
      setSku("");
      setName("");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{uiCopy("products")}</h1>
        <Button variant="outline" onClick={() => navigate("/inventory/copilot")}>
          {uiCopy("ai-create-product")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>SKU</Label>
              <Input value={sku} onChange={(event) => setSku(event.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>{uiCopy("name")}</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("type")}</Label>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={productType}
                onChange={(event) => setProductType(event.target.value as ProductType)}
              >
                <option value="STOCKABLE">{uiCopy("stockable")}</option>
                <option value="CONSUMABLE">{uiCopy("consumable")}</option>
                <option value="SERVICE">{uiCopy("service")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("uom")}</Label>
              <Input
                value={unitOfMeasure}
                onChange={(event) => setUnitOfMeasure(event.target.value)}
              />
            </div>
            <Button
              variant="accent"
              className="mt-7"
              onClick={() => createProduct.mutate()}
              disabled={!sku || !name || createProduct.isPending}
            >
              <Plus className="h-4 w-4" />
              {uiCopy("add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">SKU</th>
                <th>{uiCopy("name")}</th>
                <th>{uiCopy("type")}</th>
                <th>{uiCopy("uom")}</th>
                <th>{uiCopy("status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productsLoading ? (
                <TableLoadingSkeleton columns={6} label={t("common.loading")} />
              ) : productsError && !data ? (
                <tr>
                  <td colSpan={6} className="p-4 text-sm text-destructive">
                    <p role="alert">{t("common.error")}</p>
                  </td>
                </tr>
              ) : (
                <>
                  {data?.items.map((product) => (
                    <tr key={product.id} className="border-t border-border">
                      <td className="py-2 font-medium">{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.productType}</td>
                      <td>{product.unitOfMeasure}</td>
                      <td>
                        <Badge variant={product.isActive ? "secondary" : "outline"}>
                          {product.isActive ? uiCopy("active") : uiCopy("inactive")}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/inventory/products/${product.id}`)}
                        >
                          {uiCopy("view")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
