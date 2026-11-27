import { useTranslation } from "react-i18next";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { TableLoadingSkeleton, Label } from "@corely/ui";
import { inventoryApi } from "@/lib/inventory-api";
import { PartyPicker } from "@/shared/components";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";
import type { InventoryDocumentType } from "@corely/contracts";

export default function DocumentsPage() {
  const { t } = useTranslation();
  const uiCopy = useUiCopy("ui.inventory-documentspage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: documentsLoading,
    isError: documentsError,
  } = useQuery({
    queryKey: inventoryQueryKeys.documents.list(),
    queryFn: () => inventoryApi.listDocuments(),
  });

  const [documentType, setDocumentType] = useState<InventoryDocumentType>("RECEIPT");
  const [partyId, setPartyId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");

  const createDocument = useMutation({
    mutationFn: () =>
      inventoryApi.createDocument({
        documentType,
        partyId: partyId || undefined,
        postingDate,
        lineItems: [
          {
            productId,
            quantity: Number(quantity),
            fromLocationId: fromLocationId || undefined,
            toLocationId: toLocationId || undefined,
          },
        ],
      }),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.documents.lists() });
      navigate(`/inventory/documents/${doc.id}`);
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{uiCopy("documents")}</h1>
        <Button variant="outline" onClick={() => navigate("/inventory/copilot")}>
          {uiCopy("ai-create-doc")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{uiCopy("type")}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as InventoryDocumentType)}
              >
                <option value="RECEIPT">{uiCopy("receipt")}</option>
                <option value="DELIVERY">{uiCopy("delivery")}</option>
                <option value="TRANSFER">{uiCopy("transfer")}</option>
                <option value="ADJUSTMENT">{uiCopy("adjustment")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("party-id")}</Label>
              <PartyPicker
                value={partyId}
                onValueChange={setPartyId}
                placeholder={uiCopy("select-party-optional")}
                searchPlaceholder="Search party..."
                testId="inventory-document-party-picker"
              />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("posting-date")}</Label>
              <Input
                type="date"
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="accent"
                onClick={() => createDocument.mutate()}
                disabled={!productId || createDocument.isPending}
              >
                {uiCopy("create-draft")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{uiCopy("product-id")}</Label>
              <Input value={productId} onChange={(event) => setProductId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("quantity")}</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("from-location")}</Label>
              <Input
                value={fromLocationId}
                onChange={(event) => setFromLocationId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{uiCopy("to-location")}</Label>
              <Input
                value={toLocationId}
                onChange={(event) => setToLocationId(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">{uiCopy("number")}</th>
                <th>{uiCopy("type")}</th>
                <th>{uiCopy("status")}</th>
                <th>{uiCopy("posting-date")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documentsLoading ? (
                <TableLoadingSkeleton columns={5} label={t("common.loading")} />
              ) : documentsError && !data ? (
                <tr>
                  <td colSpan={5} className="p-4 text-sm text-destructive">
                    <p role="alert">{t("common.error")}</p>
                  </td>
                </tr>
              ) : (
                <>
                  {data?.items.map((doc) => (
                    <tr key={doc.id} className="border-t border-border">
                      <td className="py-2 font-medium">{doc.documentNumber || uiCopy("draft")}</td>
                      <td>{doc.documentType}</td>
                      <td>{doc.status}</td>
                      <td>{doc.postingDate || "-"}</td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/inventory/documents/${doc.id}`)}
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
