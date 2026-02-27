import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { z } from "zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CreateServiceOfferingInput, ResourceType } from "@corely/contracts";

import { bookingApi } from "@/lib/booking-api";
import { bookingServiceKeys } from "../queries";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Checkbox, Input, Label, Textarea } from "@corely/ui";

const RESOURCE_TYPES: ResourceType[] = ["STAFF", "ROOM", "EQUIPMENT"];

const serviceFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().max(2000).optional(),
    durationMinutes: z
      .string()
      .trim()
      .min(1, "Duration is required")
      .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
        message: "Duration must be a positive integer",
      }),
    bufferBeforeMinutes: z
      .string()
      .trim()
      .default("0")
      .refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Buffer before must be a non-negative integer",
      }),
    bufferAfterMinutes: z
      .string()
      .trim()
      .default("0")
      .refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Buffer after must be a non-negative integer",
      }),
    priceCents: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Price must be a non-negative integer",
      }),
    currency: z.string().trim().max(16).optional(),
    depositCents: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Deposit must be a non-negative integer",
      }),
    requiredResourceTypes: z.array(z.enum(["STAFF", "ROOM", "EQUIPMENT"])).default([]),
    requiredTagsText: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((values, context) => {
    if (values.depositCents && values.priceCents) {
      const deposit = Number(values.depositCents);
      const price = Number(values.priceCents);
      if (deposit > price) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["depositCents"],
          message: "Deposit cannot be greater than price",
        });
      }
    }
  });

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const DEFAULT_VALUES: ServiceFormValues = {
  name: "",
  description: "",
  durationMinutes: "60",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
  priceCents: "",
  currency: "USD",
  depositCents: "",
  requiredResourceTypes: [],
  requiredTagsText: "",
  isActive: true,
};

const toOptionalInt = (value: string | undefined) => {
  if (!value || value.trim() === "") {
    return undefined;
  }
  return Number(value);
};

const toPayload = (values: ServiceFormValues): CreateServiceOfferingInput => ({
  name: values.name.trim(),
  description: values.description?.trim() ? values.description.trim() : undefined,
  durationMinutes: Number(values.durationMinutes),
  bufferBeforeMinutes: Number(values.bufferBeforeMinutes || "0"),
  bufferAfterMinutes: Number(values.bufferAfterMinutes || "0"),
  priceCents: toOptionalInt(values.priceCents),
  currency: values.currency?.trim() ? values.currency.trim() : undefined,
  depositCents: toOptionalInt(values.depositCents),
  requiredResourceTypes: values.requiredResourceTypes.length
    ? values.requiredResourceTypes
    : undefined,
  requiredTags: values.requiredTagsText
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
  isActive: values.isActive,
});

export default function ServiceEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const serviceQuery = useQuery({
    queryKey: id ? bookingServiceKeys.detail(id) : ["booking/services", "new"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing service id");
      }
      return bookingApi.getService(id);
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (!serviceQuery.data) {
      return;
    }

    form.reset({
      name: serviceQuery.data.name,
      description: serviceQuery.data.description ?? "",
      durationMinutes: String(serviceQuery.data.durationMinutes),
      bufferBeforeMinutes: String(serviceQuery.data.bufferBeforeMinutes ?? 0),
      bufferAfterMinutes: String(serviceQuery.data.bufferAfterMinutes ?? 0),
      priceCents:
        typeof serviceQuery.data.priceCents === "number"
          ? String(serviceQuery.data.priceCents)
          : "",
      currency: serviceQuery.data.currency ?? "USD",
      depositCents:
        typeof serviceQuery.data.depositCents === "number"
          ? String(serviceQuery.data.depositCents)
          : "",
      requiredResourceTypes: serviceQuery.data.requiredResourceTypes ?? [],
      requiredTagsText: (serviceQuery.data.requiredTags ?? []).join(", "),
      isActive: serviceQuery.data.isActive,
    });
  }, [form, serviceQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const payload = toPayload(values);
      if (id) {
        return bookingApi.updateService(id, payload);
      }
      return bookingApi.createService(payload);
    },
    onSuccess: async (result) => {
      const savedId = result.service.id;
      toast.success(isEdit ? "Service updated" : "Service created");
      await invalidateResourceQueries(queryClient, "booking/services", { id: savedId });
      navigate(`/booking/services/${savedId}`);
    },
    onError: (error) => {
      const validationErrors = mapValidationErrorsToForm(error);
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (field in DEFAULT_VALUES) {
          form.setError(field as keyof ServiceFormValues, { message });
        }
      });

      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to save service");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing service id");
      }
      await bookingApi.deleteService(id);
    },
    onSuccess: async () => {
      toast.success("Service deleted");
      await invalidateResourceQueries(queryClient, "booking/services");
      navigate("/booking/services");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to delete service");
    },
  });

  const selectedResourceTypes = form.watch("requiredResourceTypes") || [];

  const toggleResourceType = (resourceType: ResourceType, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedResourceTypes, resourceType]))
      : selectedResourceTypes.filter((value) => value !== resourceType);
    form.setValue("requiredResourceTypes", next, { shouldDirty: true, shouldValidate: true });
  };

  const pageTitle = useMemo(() => (isEdit ? "Edit service" : "Create service"), [isEdit]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/services")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure duration, buffers, pricing, and required resources.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEdit ? (
            <ConfirmDeleteDialog
              trigger={
                <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              }
              title="Delete service"
              description="This action cannot be undone."
              isLoading={deleteMutation.isPending}
              onConfirm={async () => {
                await deleteMutation.mutateAsync();
              }}
            />
          ) : null}
          <Button
            variant="outline"
            onClick={() => navigate(isEdit && id ? `/booking/services/${id}` : "/booking/services")}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>

      {isEdit && serviceQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading service...
          </CardContent>
        </Card>
      ) : null}

      {isEdit && serviceQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load service.</div>
            <Button variant="outline" size="sm" onClick={() => void serviceQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(!isEdit || serviceQuery.data) && !serviceQuery.isError ? (
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <Label htmlFor="service-name">Name</Label>
                <Input id="service-name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="service-description">Description</Label>
                <Textarea id="service-description" rows={3} {...form.register("description")} />
                {form.formState.errors.description ? (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="service-duration">Duration (minutes)</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min={1}
                    {...form.register("durationMinutes")}
                  />
                  {form.formState.errors.durationMinutes ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.durationMinutes.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="service-buffer-before">Buffer before (minutes)</Label>
                  <Input
                    id="service-buffer-before"
                    type="number"
                    min={0}
                    {...form.register("bufferBeforeMinutes")}
                  />
                  {form.formState.errors.bufferBeforeMinutes ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.bufferBeforeMinutes.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="service-buffer-after">Buffer after (minutes)</Label>
                  <Input
                    id="service-buffer-after"
                    type="number"
                    min={0}
                    {...form.register("bufferAfterMinutes")}
                  />
                  {form.formState.errors.bufferAfterMinutes ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.bufferAfterMinutes.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="service-price">Price (cents)</Label>
                  <Input
                    id="service-price"
                    type="number"
                    min={0}
                    {...form.register("priceCents")}
                  />
                  {form.formState.errors.priceCents ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.priceCents.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="service-deposit">Deposit (cents)</Label>
                  <Input
                    id="service-deposit"
                    type="number"
                    min={0}
                    {...form.register("depositCents")}
                  />
                  {form.formState.errors.depositCents ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.depositCents.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="service-currency">Currency</Label>
                  <Input id="service-currency" placeholder="USD" {...form.register("currency")} />
                  {form.formState.errors.currency ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.currency.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <Label>Required Resource Types</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {RESOURCE_TYPES.map((resourceType) => {
                    const checked = selectedResourceTypes.includes(resourceType);
                    return (
                      <label
                        key={resourceType}
                        className="flex items-center gap-2 border border-border rounded-md px-3 py-2"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleResourceType(resourceType, Boolean(value))
                          }
                        />
                        <span className="text-sm">{resourceType}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedResourceTypes.length ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedResourceTypes.map((resourceType) => (
                      <Badge key={resourceType} variant="outline">
                        {resourceType}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="service-tags">Required Tags (comma-separated)</Label>
                <Input
                  id="service-tags"
                  placeholder="vip, consultation"
                  {...form.register("requiredTagsText")}
                />
              </div>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", Boolean(checked), { shouldDirty: true })
                  }
                />
                <span className="text-sm">Service is active</span>
              </label>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
