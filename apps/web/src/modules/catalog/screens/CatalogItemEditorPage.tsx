import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@corely/ui";
import { catalogApi } from "@/lib/catalog-api";
import {
  catalogCategoryKeys,
  catalogItemKeys,
  catalogTaxProfileKeys,
  catalogUomKeys,
} from "../queries";

type FormState = {
  code: string;
  name: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  defaultUomId: string;
  taxProfileId: string;
  requiresLotTracking: boolean;
  requiresExpiryDate: boolean;
  shelfLifeDays: string;
  hsCode: string;
};

const defaultState: FormState = {
  code: "",
  name: "",
  description: "",
  type: "PRODUCT",
  defaultUomId: "",
  taxProfileId: "",
  requiresLotTracking: false,
  requiresExpiryDate: false,
  shelfLifeDays: "",
  hsCode: "",
};

export default function CatalogItemEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isNew = id === undefined || id === "new";

  const [variantDraft, setVariantDraft] = useState({ sku: "", name: "", barcodes: "" });

  const { data: uoms } = useQuery({
    queryKey: catalogUomKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listUoms({ page: 1, pageSize: 200 }),
  });

  const { data: taxProfiles } = useQuery({
    queryKey: catalogTaxProfileKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listTaxProfiles({ page: 1, pageSize: 200 }),
  });

  const { data: categories } = useQuery({
    queryKey: catalogCategoryKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listCategories({ page: 1, pageSize: 200 }),
  });

  const itemQuery = useQuery({
    enabled: !isNew,
    queryKey: catalogItemKeys.detail(id),
    queryFn: () => catalogApi.getItem(id!),
  });

  const initial = useMemo<FormState>(() => {
    if (!itemQuery.data?.item) {
      return defaultState;
    }
    const item = itemQuery.data.item;
    return {
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      type: item.type,
      defaultUomId: item.defaultUomId,
      taxProfileId: item.taxProfileId ?? "",
      requiresLotTracking: item.requiresLotTracking,
      requiresExpiryDate: item.requiresExpiryDate,
      shelfLifeDays: item.shelfLifeDays ? String(item.shelfLifeDays) : "",
      hsCode: item.hsCode ?? "",
    };
  }, [itemQuery.data]);

  const [form, setForm] = useState<FormState>(initial);
  React.useEffect(() => setForm(initial), [initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        defaultUomId: form.defaultUomId,
        taxProfileId: form.taxProfileId || undefined,
        requiresLotTracking: form.requiresLotTracking,
        requiresExpiryDate: form.requiresExpiryDate,
        shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : undefined,
        hsCode: form.hsCode || undefined,
      };
      if (isNew) {
        return catalogApi.createItem(payload as any);
      }
      return catalogApi.updateItem(id!, { itemId: id!, patch: payload } as any);
    },
    onSuccess: async (result) => {
      const itemId = "item" in result ? result.item.id : (result as any).item.id;
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.all() });
      navigate(`/catalog/items/${itemId}`);
    },
  });

  const variantMutation = useMutation({
    mutationFn: () =>
      catalogApi.upsertVariant(id!, {
        itemId: id!,
        sku: variantDraft.sku,
        name: variantDraft.name || undefined,
        barcodes: variantDraft.barcodes
          ? variantDraft.barcodes
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
      }),
    onSuccess: async () => {
      setVariantDraft({ sku: "", name: "", barcodes: "" });
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.detail(id) });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? "New Catalog Item" : "Catalog Item"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/catalog/items")}>
            Back
          </Button>
          <Button
            variant="accent"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <label className="text-sm">
            Code
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="text-sm md:col-span-2">
            Description
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            Type
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value as any }))
              }
            >
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </label>
          <label className="text-sm">
            Default UOM
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.defaultUomId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, defaultUomId: event.target.value }))
              }
            >
              <option value="">Select UOM</option>
              {(uoms?.items ?? []).map((uom) => (
                <option key={uom.id} value={uom.id}>
                  {uom.code} - {uom.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tax Profile
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.taxProfileId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, taxProfileId: event.target.value }))
              }
            >
              <option value="">None</option>
              {(taxProfiles?.items ?? []).map((taxProfile) => (
                <option key={taxProfile.id} value={taxProfile.id}>
                  {taxProfile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Shelf Life (days)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              value={form.shelfLifeDays}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, shelfLifeDays: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            HS Code
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              value={form.hsCode}
              onChange={(event) => setForm((prev) => ({ ...prev, hsCode: event.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.requiresLotTracking}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requiresLotTracking: event.target.checked }))
              }
            />
            Requires lot tracking
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.requiresExpiryDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requiresExpiryDate: event.target.checked }))
              }
            />
            Requires expiry date
          </label>
          <div className="text-sm md:col-span-2 text-muted-foreground">
            Categories available:{" "}
            {(categories?.items ?? []).map((category) => category.name).join(", ") || "None"}
          </div>
        </CardContent>
      </Card>

      {!isNew && itemQuery.data?.item ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-semibold">Variants</h2>
            {(itemQuery.data.item.variants ?? []).map((variant) => (
              <div key={variant.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-mono">{variant.sku}</div>
                <div>{variant.name || "Unnamed variant"}</div>
              </div>
            ))}
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="rounded-md border border-input bg-background px-3 py-2"
                placeholder="Variant SKU"
                value={variantDraft.sku}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, sku: event.target.value }))
                }
              />
              <input
                className="rounded-md border border-input bg-background px-3 py-2"
                placeholder="Variant Name"
                value={variantDraft.name}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="rounded-md border border-input bg-background px-3 py-2"
                placeholder="Barcodes (comma separated)"
                value={variantDraft.barcodes}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, barcodes: event.target.value }))
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={() => variantMutation.mutate()}
              disabled={variantMutation.isPending || !variantDraft.sku}
            >
              Add Variant
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
