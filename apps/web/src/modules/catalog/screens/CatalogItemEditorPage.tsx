import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { toast } from "sonner";
import type { CreateCatalogItemInput, UpdateCatalogItemInput } from "@corely/contracts";

import { catalogApi } from "@/lib/catalog-api";
import {
  catalogCategoryKeys,
  catalogItemKeys,
  catalogTaxProfileKeys,
  catalogUomKeys,
} from "../queries";

import { defaultState, type FormState, type FormErrors } from "./catalog-item-editor-state";

export default function CatalogItemEditorPage() {
  const uiCopy = useUiCopy("ui.catalog-catalogitemeditorpage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isNew = id === undefined || id === "new";
  const existingItemId = !isNew && id ? id : undefined;

  const [variantDraft, setVariantDraft] = useState({ sku: "", name: "", barcodes: "" });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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
    enabled: !!existingItemId,
    queryKey: catalogItemKeys.detail(id),
    queryFn: () => {
      if (!existingItemId) {
        throw new Error("Item id is missing");
      }
      return catalogApi.getItem(existingItemId);
    },
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

  React.useEffect(() => {
    setForm(initial);
  }, [initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Omit<CreateCatalogItemInput, "idempotencyKey"> = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        defaultUomId: form.defaultUomId,
        taxProfileId: form.taxProfileId || undefined,
        requiresLotTracking: form.requiresLotTracking,
        requiresExpiryDate: form.requiresExpiryDate,
        shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : undefined,
        hsCode: form.hsCode.trim() || undefined,
      };

      if (isNew) {
        return catalogApi.createItem(payload);
      }

      if (!existingItemId) {
        throw new Error("Item id is missing");
      }

      const updateInput: UpdateCatalogItemInput = {
        itemId: existingItemId,
        patch: payload,
      };
      return catalogApi.updateItem(existingItemId, updateInput);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.all() });
      toast.success(isNew ? "Catalog item created" : "Catalog item updated");
      navigate(`/catalog/items/${result.item.id}`);
    },
    onError: () => {
      toast.error(uiCopy("failed-to-save-catalog"));
    },
  });

  const variantMutation = useMutation({
    mutationFn: () => {
      if (!existingItemId) {
        throw new Error("Item id is missing");
      }
      return catalogApi.upsertVariant(existingItemId, {
        itemId: existingItemId,
        sku: variantDraft.sku,
        name: variantDraft.name || undefined,
        barcodes: variantDraft.barcodes
          ? variantDraft.barcodes
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
      });
    },
    onSuccess: async () => {
      setVariantDraft({ sku: "", name: "", barcodes: "" });
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.detail(existingItemId) });
      toast.success(uiCopy("variant-added"));
    },
    onError: () => {
      toast.error(uiCopy("failed-to-add-variant"));
    },
  });

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.code.trim()) {
      nextErrors.code = uiCopy("code-required");
    }

    if (!form.name.trim()) {
      nextErrors.name = uiCopy("name-required");
    }

    if (!form.defaultUomId) {
      nextErrors.defaultUomId = uiCopy("default-uom-required");
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      toast.error(uiCopy("please-fill-in-all"));
      return;
    }

    saveMutation.mutate();
  };

  const item = itemQuery.data?.item;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/catalog/items")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">
              {isNew ? uiCopy("create-catalog-item") : uiCopy("edit-catalog-item")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isNew ? uiCopy("add-a-product-or") : uiCopy("update-item-attributes-used")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                isNew || !existingItemId ? "/catalog/items" : `/catalog/items/${existingItemId}`
              )
            }
            disabled={saveMutation.isPending}
          >
            {uiCopy("cancel")}
          </Button>
          <Button
            variant="accent"
            type="submit"
            form="catalog-item-form"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending
              ? uiCopy("saving")
              : isNew
                ? uiCopy("create-item")
                : uiCopy("save-changes")}
          </Button>
        </div>
      </div>

      {!isNew && itemQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {uiCopy("loading-catalog-item")}
          </CardContent>
        </Card>
      ) : null}

      {!isNew && itemQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="text-sm text-destructive">{uiCopy("catalog-item-could-not")}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: catalogItemKeys.detail(id) })
              }
            >
              {uiCopy("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(isNew || item) && !itemQuery.isError ? (
        <form id="catalog-item-form" onSubmit={onSubmit} data-testid="catalog-item-form">
          <Card>
            <CardContent className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <Label htmlFor="catalog-item-code">
                  {uiCopy("code") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="catalog-item-code"
                  value={form.code}
                  onChange={(event) => {
                    setFormErrors((prev) => ({ ...prev, code: undefined }));
                    setForm((prev) => ({ ...prev, code: event.target.value }));
                  }}
                  placeholder={uiCopy("sku-or-internal-code")}
                />
                {formErrors.code ? (
                  <p className="text-sm text-destructive mt-1">{formErrors.code}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="catalog-item-name">
                  {uiCopy("name") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="catalog-item-name"
                  value={form.name}
                  onChange={(event) => {
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                    setForm((prev) => ({ ...prev, name: event.target.value }));
                  }}
                  placeholder={uiCopy("business-name")}
                />
                {formErrors.name ? (
                  <p className="text-sm text-destructive mt-1">{formErrors.name}</p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="catalog-item-description">{uiCopy("description")}</Label>
                <Textarea
                  id="catalog-item-description"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder={uiCopy("optional-internal-description")}
                />
              </div>

              <div>
                <Label htmlFor="catalog-item-type">{uiCopy("type")}</Label>
                <select
                  id="catalog-item-type"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as "PRODUCT" | "SERVICE",
                    }))
                  }
                >
                  <option value="PRODUCT">{uiCopy("product")}</option>
                  <option value="SERVICE">{uiCopy("service")}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="catalog-item-uom">
                  {uiCopy("default-uom") + " "}
                  <span className="text-destructive">*</span>
                </Label>
                <select
                  id="catalog-item-uom"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
                  value={form.defaultUomId}
                  onChange={(event) => {
                    setFormErrors((prev) => ({ ...prev, defaultUomId: undefined }));
                    setForm((prev) => ({ ...prev, defaultUomId: event.target.value }));
                  }}
                >
                  <option value="">{uiCopy("select-uom")}</option>
                  {(uoms?.items ?? []).map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.code} - {uom.name}
                    </option>
                  ))}
                </select>
                {formErrors.defaultUomId ? (
                  <p className="text-sm text-destructive mt-1">{formErrors.defaultUomId}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="catalog-item-tax-profile">{uiCopy("tax-profile")}</Label>
                <select
                  id="catalog-item-tax-profile"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
                  value={form.taxProfileId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, taxProfileId: event.target.value }))
                  }
                >
                  <option value="">{uiCopy("none")}</option>
                  {(taxProfiles?.items ?? []).map((taxProfile) => (
                    <option key={taxProfile.id} value={taxProfile.id}>
                      {taxProfile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="catalog-item-shelf-life">{uiCopy("shelf-life-days")}</Label>
                <Input
                  id="catalog-item-shelf-life"
                  type="number"
                  min={0}
                  value={form.shelfLifeDays}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, shelfLifeDays: event.target.value }))
                  }
                  placeholder={uiCopy("optional")}
                />
              </div>

              <div>
                <Label htmlFor="catalog-item-hs-code">{uiCopy("hs-code")}</Label>
                <Input
                  id="catalog-item-hs-code"
                  value={form.hsCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, hsCode: event.target.value }))}
                  placeholder={uiCopy("optional")}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresLotTracking}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, requiresLotTracking: event.target.checked }))
                  }
                />
                {uiCopy("requires-lot-tracking")}
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresExpiryDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, requiresExpiryDate: event.target.checked }))
                  }
                />
                {uiCopy("requires-expiry-date")}
              </label>

              <div className="md:col-span-2 text-sm text-muted-foreground">
                {uiCopy("categories-available")}{" "}
                {(categories?.items ?? []).map((category) => category.name).join(", ") ||
                  uiCopy("none")}
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {!isNew && item ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">{uiCopy("variants")}</h2>

            {(item.variants ?? []).map((variant) => (
              <div key={variant.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-mono">{variant.sku}</div>
                <div>{variant.name || uiCopy("unnamed-variant")}</div>
              </div>
            ))}

            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder={uiCopy("variant-sku")}
                value={variantDraft.sku}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, sku: event.target.value }))
                }
              />
              <Input
                placeholder={uiCopy("variant-name")}
                value={variantDraft.name}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <Input
                placeholder={uiCopy("barcodes-comma-separated")}
                value={variantDraft.barcodes}
                onChange={(event) =>
                  setVariantDraft((prev) => ({ ...prev, barcodes: event.target.value }))
                }
              />
            </div>

            <Button
              variant="outline"
              onClick={() => variantMutation.mutate()}
              disabled={variantMutation.isPending || !variantDraft.sku.trim()}
            >
              {variantMutation.isPending ? uiCopy("adding") : uiCopy("add-variant")}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
