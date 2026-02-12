import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Path, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, Ship } from "lucide-react";
import type { CreateShipmentInput, ShippingMode } from "@corely/contracts";
import { Alert, AlertDescription, AlertTitle, Button } from "@corely/ui";
import { toast } from "sonner";
import { importShipmentsApi } from "@/lib/import-shipments-api";
import { purchasingApi } from "@/lib/purchasing-api";
import { catalogApi } from "@/lib/catalog-api";
import { hasPermission, useEffectivePermissions } from "@/shared/lib/permissions";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { NewShipmentFormContent } from "./new-shipment-form-content";

const shippingModeSchema = z.enum(["SEA", "AIR", "LAND", "COURIER"]);

const amountSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
    message: "Amount must be a non-negative number",
  });

const lineSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  hsCode: z.string().trim().optional(),
  orderedQty: z
    .string()
    .trim()
    .min(1, "Ordered quantity is required")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "Ordered quantity must be a positive integer",
    }),
  unitFobCost: amountSchema,
  weightKg: amountSchema,
  volumeM3: amountSchema,
});

const formSchema = z
  .object({
    supplierPartyId: z.string().trim().min(1, "Supplier is required"),
    supplierReference: z.string().trim().optional(),
    shippingMode: shippingModeSchema.default("SEA"),
    carrierName: z.string().trim().optional(),
    vesselName: z.string().trim().optional(),
    voyageNumber: z.string().trim().optional(),
    billOfLadingNumber: z.string().trim().optional(),
    containerNumber: z.string().trim().optional(),
    sealNumber: z.string().trim().optional(),
    originCountry: z.string().trim().optional(),
    originPort: z.string().trim().optional(),
    destinationCountry: z.string().trim().optional(),
    destinationPort: z.string().trim().optional(),
    departureDate: z.string().trim().optional(),
    estimatedArrivalDate: z.string().trim().optional(),
    actualArrivalDate: z.string().trim().optional(),
    clearanceDate: z.string().trim().optional(),
    receivedDate: z.string().trim().optional(),
    fobValue: amountSchema,
    freightCost: amountSchema,
    insuranceCost: amountSchema,
    customsDuty: amountSchema,
    customsTax: amountSchema,
    otherCosts: amountSchema,
    notes: z.string().trim().optional(),
    lines: z.array(lineSchema).default([]),
  })
  .superRefine((values, ctx) => {
    if (
      values.departureDate &&
      values.estimatedArrivalDate &&
      values.estimatedArrivalDate < values.departureDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedArrivalDate"],
        message: "ETA must not be earlier than departure date",
      });
    }
  });

export type NewShipmentFormValues = z.infer<typeof formSchema>;

const toNullableString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toNullableNumber = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
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

export default function NewShipmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasCapability, isLoading: isConfigLoading } = useWorkspaceConfig();
  const { data: effectivePermissions, isLoading: isPermissionsLoading } = useEffectivePermissions();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const rbacEnabled = hasCapability("workspace.rbac");
  const canManageShipments =
    !rbacEnabled || hasPermission(effectivePermissions?.permissions, "import.shipments.manage");

  const form = useForm<NewShipmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierPartyId: "",
      supplierReference: "",
      shippingMode: "SEA",
      carrierName: "",
      vesselName: "",
      voyageNumber: "",
      billOfLadingNumber: "",
      containerNumber: "",
      sealNumber: "",
      originCountry: "",
      originPort: "",
      destinationCountry: "",
      destinationPort: "",
      departureDate: "",
      estimatedArrivalDate: "",
      actualArrivalDate: "",
      clearanceDate: "",
      receivedDate: "",
      fobValue: "",
      freightCost: "",
      insuranceCost: "",
      customsDuty: "",
      customsTax: "",
      otherCosts: "",
      notes: "",
      lines: [],
    },
  });

  const {
    fields: lineFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const suppliersQuery = useQuery({
    queryKey: ["import", "suppliers", "new-shipment"],
    queryFn: () => purchasingApi.listSuppliers({ pageSize: 200 }),
  });

  const productsQuery = useQuery({
    queryKey: ["import", "products", "new-shipment"],
    queryFn: () => catalogApi.listItems({ type: "PRODUCT", status: "ACTIVE", pageSize: 200 }),
  });

  const suppliers = suppliersQuery.data?.suppliers ?? [];
  const products = productsQuery.data?.items ?? [];

  const productById = useMemo(() => {
    const map = new Map<string, (typeof products)[number]>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  useEffect(() => {
    if (!form.getValues("supplierPartyId") && suppliers.length > 0) {
      form.setValue("supplierPartyId", suppliers[0].id);
    }
  }, [form, suppliers]);

  const createMutation = useMutation({
    mutationFn: (input: CreateShipmentInput) => importShipmentsApi.createShipment(input),
    onSuccess: (shipment) => {
      toast.success("Draft shipment created");
      void queryClient.invalidateQueries({ queryKey: ["import", "shipments"] });
      navigate(`/import/shipments/${shipment.id}`);
    },
    onError: (error) => {
      const fieldErrors = mapValidationErrorsToForm(error);
      for (const [field, message] of Object.entries(fieldErrors)) {
        form.setError(field as Path<NewShipmentFormValues>, { message });
      }

      if (Object.keys(fieldErrors).length > 0) {
        setGlobalError("Please fill the required fields to create a draft shipment.");
        return;
      }

      const apiError = normalizeError(error);
      setGlobalError(apiError.detail || "Failed to create shipment draft. Please try again.");
      toast.error("Failed to create shipment draft");
    },
  });

  const watchedLines = form.watch("lines");
  const watchedFobValue = form.watch("fobValue");
  const watchedFreight = form.watch("freightCost");
  const watchedInsurance = form.watch("insuranceCost");
  const watchedDuty = form.watch("customsDuty");
  const watchedTax = form.watch("customsTax");
  const watchedOther = form.watch("otherCosts");

  const lineTotals = useMemo(() => {
    let totalOrderedQty = 0;
    let totalFobCents = 0;

    for (const line of watchedLines) {
      const orderedQty = Number(line.orderedQty || 0);
      if (Number.isFinite(orderedQty) && orderedQty > 0) {
        totalOrderedQty += orderedQty;
      }

      const unitFobCents = toCents(line.unitFobCost);
      if (unitFobCents !== undefined && orderedQty > 0) {
        totalFobCents += unitFobCents * orderedQty;
      }
    }

    return { totalOrderedQty, totalFobCents };
  }, [watchedLines]);

  const explicitFobCents = toCents(watchedFobValue);
  const derivedFobCents = lineTotals.totalFobCents > 0 ? lineTotals.totalFobCents : undefined;
  const effectiveFobCents = explicitFobCents ?? derivedFobCents ?? 0;
  const freightCents = toCents(watchedFreight) ?? 0;
  const insuranceCents = toCents(watchedInsurance) ?? 0;
  const dutyCents = toCents(watchedDuty) ?? 0;
  const taxCents = toCents(watchedTax) ?? 0;
  const otherCents = toCents(watchedOther) ?? 0;
  const totalLandedCostCents =
    effectiveFobCents + freightCents + insuranceCents + dutyCents + taxCents + otherCents;
  const hasFob = explicitFobCents !== undefined || derivedFobCents !== undefined;

  const onSubmit = (values: NewShipmentFormValues) => {
    setGlobalError(null);

    const payload: CreateShipmentInput = {
      supplierPartyId: values.supplierPartyId,
      shippingMode: values.shippingMode as ShippingMode,
      containerNumber: toNullableString(values.containerNumber),
      sealNumber: toNullableString(values.sealNumber),
      billOfLadingNumber: toNullableString(values.billOfLadingNumber),
      carrierName: toNullableString(values.carrierName),
      vesselName: toNullableString(values.vesselName),
      voyageNumber: toNullableString(values.voyageNumber),
      originCountry: toNullableString(values.originCountry),
      originPort: toNullableString(values.originPort),
      destinationCountry: toNullableString(values.destinationCountry),
      destinationPort: toNullableString(values.destinationPort),
      departureDate: values.departureDate || null,
      estimatedArrivalDate: values.estimatedArrivalDate || null,
      actualArrivalDate: values.actualArrivalDate || null,
      clearanceDate: values.clearanceDate || null,
      receivedDate: values.receivedDate || null,
      fobValueCents: toCents(values.fobValue),
      freightCostCents: toCents(values.freightCost),
      insuranceCostCents: toCents(values.insuranceCost),
      customsDutyCents: toCents(values.customsDuty),
      customsTaxCents: toCents(values.customsTax),
      otherCostsCents: toCents(values.otherCosts),
      notes: toNullableString(values.notes),
      metadataJson: values.supplierReference?.trim()
        ? { supplierReference: values.supplierReference.trim() }
        : undefined,
      lines: values.lines.map((line) => ({
        productId: line.productId,
        hsCode: toNullableString(line.hsCode),
        orderedQty: Number(line.orderedQty),
        unitFobCostCents: toCents(line.unitFobCost) ?? null,
        weightKg: toNullableNumber(line.weightKg),
        volumeM3: toNullableNumber(line.volumeM3),
      })),
    };

    createMutation.mutate(payload);
  };

  const onInvalidSubmit = () => {
    setGlobalError("Please fill the required fields to create a draft shipment.");
    toast.error("Please fill the required fields to create a draft shipment.");
  };

  if (isConfigLoading || isPermissionsLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Loading create shipment screen...</p>
      </div>
    );
  }

  if (!hasCapability("import.basic")) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Ship className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Import / Shipments / New
            </p>
            <h1 className="text-h1 text-foreground">Create Shipment</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Import features aren&apos;t enabled for this workspace.</AlertTitle>
          <AlertDescription>
            Contact an admin to enable import capabilities for your workspace.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canManageShipments) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Ship className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Import / Shipments / New
            </p>
            <h1 className="text-h1 text-foreground">Create Shipment</h1>
            <p className="text-sm text-muted-foreground">Start a new import shipment draft</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTitle>
            You don&apos;t have access to create import shipments. Contact an admin to request
            access.
          </AlertTitle>
        </Alert>
        <Button variant="outline" onClick={() => navigate("/import/shipments")}>
          Back to shipments
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/import/shipments")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Import / Shipments / New
            </p>
            <h1 className="text-h1 text-foreground">Create Shipment</h1>
            <p className="text-sm text-muted-foreground">Start a new import shipment draft</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/import/shipments")}>
          Cancel
        </Button>
      </div>

      <NewShipmentFormContent
        form={form}
        onSubmit={onSubmit}
        onInvalidSubmit={onInvalidSubmit}
        globalError={globalError}
        isCreatePending={createMutation.isPending}
        suppliers={suppliers}
        products={products}
        isSuppliersLoading={suppliersQuery.isLoading}
        isSuppliersError={suppliersQuery.isError}
        isProductsError={productsQuery.isError}
        onRetrySuppliers={suppliersQuery.refetch}
        onRetryProducts={productsQuery.refetch}
        lineFields={lineFields}
        appendLine={append}
        removeLine={remove}
        productById={productById}
        lineTotals={lineTotals}
        totalLandedCostCents={totalLandedCostCents}
        hasFob={hasFob}
      />
    </div>
  );
}
