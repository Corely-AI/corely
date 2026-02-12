import React from "react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from "@corely/ui";
import type { NewShipmentFormValues } from "./NewShipmentPage";
type SupplierOption = {
  id: string;
  displayName: string;
};
type ProductOption = {
  id: string;
  name: string;
  hsCode?: string | null;
};
type NewShipmentFormContentProps = {
  form: UseFormReturn<NewShipmentFormValues>;
  onSubmit: (values: NewShipmentFormValues) => void;
  onInvalidSubmit: () => void;
  globalError: string | null;
  isCreatePending: boolean;
  suppliers: SupplierOption[];
  products: ProductOption[];
  isSuppliersLoading: boolean;
  isSuppliersError: boolean;
  isProductsError: boolean;
  onRetrySuppliers: () => Promise<unknown>;
  onRetryProducts: () => Promise<unknown>;
  lineFields: Array<FieldArrayWithId<NewShipmentFormValues, "lines", "id">>;
  appendLine: (line: NewShipmentFormValues["lines"][number]) => void;
  removeLine: (index: number) => void;
  productById: Map<string, ProductOption>;
  lineTotals: {
    totalOrderedQty: number;
    totalFobCents: number;
  };
  totalLandedCostCents: number;
  hasFob: boolean;
};
const toCents = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) {
    return undefined;
  }
  return Math.round(amount * 100);
};
const formatCurrencyFromCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function NewShipmentFormContent({
  form,
  onSubmit,
  onInvalidSubmit,
  globalError,
  isCreatePending,
  suppliers,
  products,
  isSuppliersLoading,
  isSuppliersError,
  isProductsError,
  onRetrySuppliers,
  onRetryProducts,
  lineFields,
  appendLine,
  removeLine,
  productById,
  lineTotals,
  totalLandedCostCents,
  hasFob,
}: NewShipmentFormContentProps) {
  return (
    <>
      {globalError ? (
        <Alert variant="destructive">
          <AlertTitle>Create shipment failed</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      ) : null}

      {(isSuppliersError || isProductsError) && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load form data</AlertTitle>
          <AlertDescription>
            Could not load suppliers or products. Retry and try again.
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => void onRetrySuppliers()}>
                Retry suppliers
              </Button>
              <Button variant="outline" onClick={() => void onRetryProducts()}>
                Retry products
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Supplier & Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierPartyId">Supplier</Label>
                <select
                  id="supplierPartyId"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register("supplierPartyId")}
                  disabled={isSuppliersLoading}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.displayName}
                    </option>
                  ))}
                </select>
                {form.formState.errors.supplierPartyId ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.supplierPartyId.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierReference">Supplier reference</Label>
                <Input id="supplierReference" {...form.register("supplierReference")} />
              </div>
              <div className="space-y-2">
                <Label>Shipment number</Label>
                <Input value="Assigned after create" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Shipping Mode & Transport</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingMode">Shipping mode</Label>
                <select
                  id="shippingMode"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register("shippingMode")}
                >
                  <option value="SEA">SEA</option>
                  <option value="AIR">AIR</option>
                  <option value="LAND">LAND</option>
                  <option value="COURIER">COURIER</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrierName">Carrier / forwarder</Label>
                <Input id="carrierName" {...form.register("carrierName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vesselName">Vessel name</Label>
                <Input id="vesselName" {...form.register("vesselName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voyageNumber">Voyage number</Label>
                <Input id="voyageNumber" {...form.register("voyageNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billOfLadingNumber">Bill of Lading / AWB number</Label>
                <Input id="billOfLadingNumber" {...form.register("billOfLadingNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="containerNumber">Container number</Label>
                <Input id="containerNumber" {...form.register("containerNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sealNumber">Seal number</Label>
                <Input id="sealNumber" {...form.register("sealNumber")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Route & Dates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originCountry">Origin country</Label>
                <Input id="originCountry" {...form.register("originCountry")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originPort">Origin port</Label>
                <Input id="originPort" {...form.register("originPort")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Destination country</Label>
                <Input id="destinationCountry" {...form.register("destinationCountry")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationPort">Destination port</Label>
                <Input id="destinationPort" {...form.register("destinationPort")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departureDate">Departure date</Label>
                <Input id="departureDate" type="date" {...form.register("departureDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedArrivalDate">ETA</Label>
                <Input
                  id="estimatedArrivalDate"
                  type="date"
                  {...form.register("estimatedArrivalDate")}
                />
                {form.formState.errors.estimatedArrivalDate ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.estimatedArrivalDate.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualArrivalDate">Actual arrival date</Label>
                <Input id="actualArrivalDate" type="date" {...form.register("actualArrivalDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clearanceDate">Clearance date</Label>
                <Input id="clearanceDate" type="date" {...form.register("clearanceDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedDate">Received date</Label>
                <Input id="receivedDate" type="date" {...form.register("receivedDate")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Shipment Lines</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendLine({
                    productId: "",
                    hsCode: "",
                    orderedQty: "",
                    unitFobCost: "",
                    weightKg: "",
                    volumeM3: "",
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
            {lineFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lines yet. You can create a draft without lines and add them later before submit.
              </p>
            ) : (
              <div className="space-y-4">
                {lineFields.map((field, index) => {
                  const lineProductId = form.watch(`lines.${index}.productId`);
                  const lineQty = Number(form.watch(`lines.${index}.orderedQty`) || 0);
                  const lineUnitFobCents = toCents(form.watch(`lines.${index}.unitFobCost`)) ?? 0;
                  const lineFobCents = lineQty > 0 ? lineQty * lineUnitFobCents : 0;

                  return (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2 space-y-1">
                          <Label>Product</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={lineProductId}
                            onChange={(event) => {
                              const nextProductId = event.target.value;
                              form.setValue(`lines.${index}.productId`, nextProductId, {
                                shouldValidate: true,
                              });
                              const selected = productById.get(nextProductId);
                              form.setValue(`lines.${index}.hsCode`, selected?.hsCode ?? "", {
                                shouldValidate: true,
                              });
                            }}
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                          {form.formState.errors.lines?.[index]?.productId ? (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.lines[index]?.productId?.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <Label>HS code</Label>
                          <Input {...form.register(`lines.${index}.hsCode`)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Ordered qty</Label>
                          <Input
                            type="number"
                            min="1"
                            {...form.register(`lines.${index}.orderedQty`)}
                          />
                          {form.formState.errors.lines?.[index]?.orderedQty ? (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.lines[index]?.orderedQty?.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <Label>Unit FOB cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...form.register(`lines.${index}.unitFobCost`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Line FOB cost</Label>
                          <Input
                            value={lineFobCents ? formatCurrencyFromCents(lineFobCents) : "-"}
                            disabled
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <div className="space-y-1">
                          <Label>Weight (kg)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            {...form.register(`lines.${index}.weightKg`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Volume (m³)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            {...form.register(`lines.${index}.volumeM3`)}
                          />
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {lineFields.length > 0 ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total ordered quantity</span>
                  <span className="font-medium">{lineTotals.totalOrderedQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total FOB (from lines)</span>
                  <span className="font-medium">
                    {formatCurrencyFromCents(lineTotals.totalFobCents)}
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Costs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fobValue">FOB value</Label>
                <Input
                  id="fobValue"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("fobValue")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freightCost">Freight</Label>
                <Input
                  id="freightCost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("freightCost")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceCost">Insurance</Label>
                <Input
                  id="insuranceCost"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("insuranceCost")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customsDuty">Duties</Label>
                <Input
                  id="customsDuty"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("customsDuty")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customsTax">Taxes</Label>
                <Input
                  id="customsTax"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("customsTax")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherCosts">Other</Label>
                <Input
                  id="otherCosts"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("otherCosts")}
                />
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total landed cost</span>
                <span className="font-semibold">
                  {formatCurrencyFromCents(totalLandedCostCents)}
                </span>
              </div>
              {!hasFob ? (
                <p className="text-muted-foreground mt-2">Partial total: excludes FOB</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">Notes</h2>
            <textarea
              className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional notes for customs/accounting"
              {...form.register("notes")}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="accent" type="submit" disabled={isCreatePending}>
            {isCreatePending ? "Creating..." : "Create Draft"}
          </Button>
        </div>
      </form>
    </>
  );
}
