import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PackagePlus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner";
import { catalogApi } from "@/lib/catalog-api";
import {
  catalogCategoryKeys,
  catalogItemKeys,
  catalogPriceKeys,
  catalogTaxProfileKeys,
} from "../queries";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

const NEW_CATEGORY = "__new__";

const toCode = (value: string) => value.trim().replace(/\s+/g, "-").toUpperCase();

export default function PosQuickCatalogItemPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const currency = activeWorkspace?.currency ?? "EUR";
  const existingItemId = id && id !== "new" ? id : undefined;
  const isEditing = Boolean(existingItemId);

  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    categoryId: "",
    categoryName: "",
    taxProfileId: "",
    sku: "",
    barcode: "",
  });

  const { data: categoriesData } = useQuery({
    queryKey: catalogCategoryKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listCategories({ page: 1, pageSize: 200 }),
  });

  const { data: taxProfilesData } = useQuery({
    queryKey: catalogTaxProfileKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listTaxProfiles({ page: 1, pageSize: 200 }),
  });

  const itemQuery = useQuery({
    enabled: !!existingItemId,
    queryKey: catalogItemKeys.detail(existingItemId),
    queryFn: () => {
      if (!existingItemId) {
        throw new Error("Item id is missing");
      }
      return catalogApi.getItem(existingItemId);
    },
  });

  const primaryVariant = itemQuery.data?.item.variants[0] ?? null;
  const pricesQuery = useQuery({
    enabled: !!existingItemId,
    queryKey: catalogPriceKeys.list({
      page: 1,
      pageSize: 1,
      itemId: existingItemId,
      variantId: primaryVariant?.id,
    }),
    queryFn: () =>
      catalogApi.listPrices({
        page: 1,
        pageSize: 1,
        itemId: existingItemId,
        variantId: primaryVariant?.id,
      }),
  });

  const categorySelection = form.categoryId === NEW_CATEGORY ? NEW_CATEGORY : form.categoryId;
  const initial = useMemo(
    () =>
      !itemQuery.data?.item
        ? {
            name: "",
            description: "",
            amount: "",
            categoryId: "",
            categoryName: "",
            taxProfileId: "",
            sku: "",
            barcode: "",
          }
        : {
            name: itemQuery.data.item.name,
            description: itemQuery.data.item.description ?? "",
            amount: pricesQuery.data?.items[0] ? String(pricesQuery.data.items[0].amount) : "",
            categoryId: itemQuery.data.item.categoryIds[0] ?? "",
            categoryName: "",
            taxProfileId: itemQuery.data.item.taxProfileId ?? "",
            sku: primaryVariant?.sku ?? "",
            barcode: primaryVariant?.barcodes[0]?.barcode ?? "",
          },
    [itemQuery.data, pricesQuery.data, primaryVariant]
  );

  React.useEffect(() => {
    if (isEditing) {
      setForm(initial);
    }
  }, [initial, isEditing]);

  const generatedCode = useMemo(
    () => (isEditing ? (itemQuery.data?.item.code ?? "") : toCode(form.name)),
    [form.name, isEditing, itemQuery.data?.item.code]
  );
  const generatedSku = useMemo(
    () => (isEditing ? form.sku || primaryVariant?.sku || "" : toCode(form.sku || form.name)),
    [form.name, form.sku, isEditing, primaryVariant?.sku]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = form.name.trim();
      const parsedAmount = Number(form.amount);

      if (!trimmedName) {
        throw new Error("Item name is required");
      }
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Price must be greater than zero");
      }

      if (existingItemId) {
        return catalogApi.updatePosQuickItem(existingItemId, {
          itemId: existingItemId,
          name: trimmedName,
          description: form.description.trim() || undefined,
          amount: parsedAmount,
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          categoryId:
            categorySelection && categorySelection !== NEW_CATEGORY ? categorySelection : undefined,
          categoryName:
            categorySelection === NEW_CATEGORY ? form.categoryName.trim() || undefined : undefined,
          taxProfileId: form.taxProfileId || undefined,
        });
      }

      return catalogApi.createPosQuickItem({
        name: trimmedName,
        description: form.description.trim() || undefined,
        amount: parsedAmount,
        currency,
        code: generatedCode,
        sku: generatedSku,
        barcode: form.barcode.trim() || undefined,
        categoryId:
          categorySelection && categorySelection !== NEW_CATEGORY ? categorySelection : undefined,
        categoryName:
          categorySelection === NEW_CATEGORY ? form.categoryName.trim() || undefined : undefined,
        taxProfileId: form.taxProfileId || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.all() });
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.detail(existingItemId) });
      toast.success(isEditing ? "POS item updated" : "POS item created");
      navigate("/pos/catalog");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Failed to update POS item"
            : "Failed to create POS item"
      );
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pos/catalog")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-h1 text-foreground">
            {isEditing ? "Edit POS Item" : "Quick Add POS Item"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditing
              ? "Update the POS-safe selling fields without opening full catalog back-office."
              : "Create a sellable item fast from the POS surface. Advanced catalog setup stays in back-office."}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          {isEditing && itemQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading POS item...</div>
          ) : null}

          {isEditing && itemQuery.isError ? (
            <div className="text-sm text-destructive">POS item could not be loaded.</div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pos-quick-item-name">Item name</Label>
              <Input
                id="pos-quick-item-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Pho dac biet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos-quick-item-price">Price ({currency})</Label>
              <Input
                id="pos-quick-item-price"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                inputMode="decimal"
                placeholder="12.50"
              />
            </div>

            <div className="space-y-2">
              <Label>Tax profile</Label>
              <Select
                value={form.taxProfileId || "none"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    taxProfileId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No tax profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tax profile</SelectItem>
                  {(taxProfilesData?.items ?? []).map((taxProfile) => (
                    <SelectItem key={taxProfile.id} value={taxProfile.id}>
                      {taxProfile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categorySelection || "none"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: value === "none" ? "" : value,
                    categoryName: value === NEW_CATEGORY ? current.categoryName : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {(categoriesData?.items ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY}>Create new category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {categorySelection === NEW_CATEGORY ? (
              <div className="space-y-2">
                <Label htmlFor="pos-quick-item-category-name">New category name</Label>
                <Input
                  id="pos-quick-item-category-name"
                  value={form.categoryName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoryName: event.target.value }))
                  }
                  placeholder="Dinner Specials"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pos-quick-item-sku">SKU</Label>
              <Input
                id="pos-quick-item-sku"
                value={form.sku}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sku: event.target.value }))
                }
                placeholder={generatedCode || "AUTO-GENERATED"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos-quick-item-barcode">Barcode</Label>
              <Input
                id="pos-quick-item-barcode"
                value={form.barcode}
                onChange={(event) =>
                  setForm((current) => ({ ...current, barcode: event.target.value }))
                }
                placeholder="Optional barcode"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pos-quick-item-description">Description</Label>
              <Textarea
                id="pos-quick-item-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Optional short POS description"
                rows={4}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div>
              {isEditing ? "Item code" : "Generated code"}:{" "}
              {generatedCode || "Will be generated from the item name"}
            </div>
            <div>
              {isEditing ? "Current SKU" : "Generated SKU"}:{" "}
              {generatedSku || "Will be generated from the item name"}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/pos/catalog")}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending || (isEditing && (itemQuery.isLoading || itemQuery.isError))
              }
            >
              <PackagePlus className="h-4 w-4" />
              {saveMutation.isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create POS Item"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
