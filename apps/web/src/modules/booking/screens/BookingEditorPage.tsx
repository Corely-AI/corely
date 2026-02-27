import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingKeys } from "../queries";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Checkbox, Input, Label, Textarea } from "@corely/ui";

const bookingFormSchema = z
  .object({
    startAtLocal: z.string().min(1, "Start time is required"),
    endAtLocal: z.string().min(1, "End time is required"),
    serviceOfferingId: z.string().optional(),
    selectedResourceIds: z.array(z.string()).default([]),
    bookedByPartyId: z.string().optional(),
    bookedByName: z.string().optional(),
    bookedByEmail: z
      .string()
      .optional()
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: "Enter a valid email",
      }),
    notes: z.string().optional(),
    cancelReason: z.string().optional(),
  })
  .superRefine((values, context) => {
    const start = new Date(values.startAtLocal);
    const end = new Date(values.endAtLocal);

    if (Number.isNaN(start.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAtLocal"],
        message: "Start time is invalid",
      });
    }

    if (Number.isNaN(end.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAtLocal"],
        message: "End time is invalid",
      });
      return;
    }

    if (end <= start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAtLocal"],
        message: "End time must be after start time",
      });
    }
  });

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const DEFAULT_VALUES: BookingFormValues = {
  startAtLocal: "",
  endAtLocal: "",
  serviceOfferingId: "",
  selectedResourceIds: [],
  bookedByPartyId: "",
  bookedByName: "",
  bookedByEmail: "",
  notes: "",
  cancelReason: "",
};

const toOptionalString = (value: string | undefined) => {
  if (!value || value.trim() === "") {
    return undefined;
  }
  return value.trim();
};

const toDateTimeLocal = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoFromLocal = (value: string) => new Date(value).toISOString();

export default function BookingEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const bookingQuery = useQuery({
    queryKey: id ? bookingKeys.detail(id) : ["booking/bookings", "new"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing booking id");
      }
      return bookingApi.getBooking(id);
    },
    enabled: isEdit,
  });

  const servicesQuery = useQuery({
    queryKey: ["booking/services", "options"],
    queryFn: () =>
      bookingApi.listServices({ page: 1, pageSize: 100, sort: "name:asc", isActive: true }),
  });

  const resourcesQuery = useQuery({
    queryKey: ["booking/resources", "options"],
    queryFn: () =>
      bookingApi.listResources({ page: 1, pageSize: 100, sort: "name:asc", isActive: true }),
  });

  useEffect(() => {
    if (!bookingQuery.data) {
      return;
    }

    const resourceIds = Array.from(
      new Set((bookingQuery.data.allocations ?? []).map((allocation) => allocation.resourceId))
    );

    form.reset({
      startAtLocal: toDateTimeLocal(bookingQuery.data.startAt),
      endAtLocal: toDateTimeLocal(bookingQuery.data.endAt),
      serviceOfferingId: bookingQuery.data.serviceOfferingId ?? "",
      selectedResourceIds: resourceIds,
      bookedByPartyId: bookingQuery.data.bookedByPartyId ?? "",
      bookedByName: bookingQuery.data.bookedByName ?? "",
      bookedByEmail: bookingQuery.data.bookedByEmail ?? "",
      notes: bookingQuery.data.notes ?? "",
      cancelReason: "",
    });
  }, [form, bookingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: BookingFormValues) => {
      if (id) {
        return bookingApi.rescheduleBooking(id, {
          startAt: toIsoFromLocal(values.startAtLocal),
          endAt: toIsoFromLocal(values.endAtLocal),
          notes: toOptionalString(values.notes),
        });
      }

      return bookingApi.createBooking({
        startAt: toIsoFromLocal(values.startAtLocal),
        endAt: toIsoFromLocal(values.endAtLocal),
        serviceOfferingId: toOptionalString(values.serviceOfferingId),
        resourceIds: values.selectedResourceIds,
        bookedByPartyId: toOptionalString(values.bookedByPartyId),
        bookedByName: toOptionalString(values.bookedByName),
        bookedByEmail: toOptionalString(values.bookedByEmail),
        notes: toOptionalString(values.notes),
      });
    },
    onSuccess: async (result) => {
      const savedId = result.booking.id;
      toast.success(isEdit ? "Booking rescheduled" : "Booking created");
      await invalidateResourceQueries(queryClient, "booking/bookings", { id: savedId });
      navigate(`/booking/bookings/${savedId}`);
    },
    onError: (error) => {
      const validationErrors = mapValidationErrorsToForm(error);
      const serverFieldMap: Record<string, keyof BookingFormValues> = {
        startAt: "startAtLocal",
        endAt: "endAtLocal",
        resourceIds: "selectedResourceIds",
        serviceOfferingId: "serviceOfferingId",
        bookedByPartyId: "bookedByPartyId",
        bookedByName: "bookedByName",
        bookedByEmail: "bookedByEmail",
        notes: "notes",
      };

      Object.entries(validationErrors).forEach(([field, message]) => {
        const mappedField = serverFieldMap[field] ?? (field as keyof BookingFormValues);
        if (mappedField in DEFAULT_VALUES) {
          form.setError(mappedField, { message });
        }
      });

      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to save booking");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing booking id");
      }
      return bookingApi.cancelBooking(id, {
        reason: toOptionalString(form.getValues("cancelReason")) ?? "Cancelled from edit page",
      });
    },
    onSuccess: async () => {
      toast.success("Booking cancelled");
      await invalidateResourceQueries(queryClient, "booking/bookings", id ? { id } : undefined);
      if (id) {
        navigate(`/booking/bookings/${id}`);
      }
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to cancel booking");
    },
  });

  const selectedResourceIds = form.watch("selectedResourceIds") || [];

  const toggleResourceSelection = (resourceId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedResourceIds, resourceId]))
      : selectedResourceIds.filter((value) => value !== resourceId);
    form.setValue("selectedResourceIds", next, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (values: BookingFormValues) => {
    if (!isEdit && values.selectedResourceIds.length === 0) {
      form.setError("selectedResourceIds", { message: "Select at least one resource" });
      return;
    }
    saveMutation.mutate(values);
  };

  const pageTitle = useMemo(() => (isEdit ? "Edit booking" : "Create booking"), [isEdit]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/bookings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEdit
                ? "Reschedule the booking time or cancel the booking."
                : "Create a booking by choosing service, resources, and customer info."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEdit ? (
            <ConfirmDeleteDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelMutation.isPending || bookingQuery.data?.status === "CANCELLED"}
                >
                  Cancel booking
                </Button>
              }
              title="Cancel booking"
              description="This action will mark the booking as cancelled."
              confirmLabel="Cancel booking"
              isLoading={cancelMutation.isPending}
              onConfirm={async () => {
                await cancelMutation.mutateAsync();
              }}
            />
          ) : null}
          <Button
            variant="outline"
            onClick={() => navigate(isEdit && id ? `/booking/bookings/${id}` : "/booking/bookings")}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>

      {isEdit && bookingQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading booking...
          </CardContent>
        </Card>
      ) : null}

      {isEdit && bookingQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load booking.</div>
            <Button variant="outline" size="sm" onClick={() => void bookingQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(!isEdit || bookingQuery.data) && !bookingQuery.isError ? (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-6 space-y-5">
              {isEdit && bookingQuery.data ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Status: {bookingQuery.data.status}</Badge>
                  <Badge variant="outline">
                    Reference: {bookingQuery.data.referenceNumber ?? "-"}
                  </Badge>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking-start">Start time</Label>
                  <Input
                    id="booking-start"
                    type="datetime-local"
                    {...form.register("startAtLocal")}
                  />
                  {form.formState.errors.startAtLocal ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.startAtLocal.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="booking-end">End time</Label>
                  <Input id="booking-end" type="datetime-local" {...form.register("endAtLocal")} />
                  {form.formState.errors.endAtLocal ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.endAtLocal.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {!isEdit ? (
                <>
                  <div>
                    <Label htmlFor="booking-service">Service</Label>
                    <select
                      id="booking-service"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.watch("serviceOfferingId") || ""}
                      onChange={(event) =>
                        form.setValue("serviceOfferingId", event.target.value, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <option value="">No linked service</option>
                      {(servicesQuery.data?.items ?? []).map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Resources</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {(resourcesQuery.data?.items ?? []).map((resource) => {
                        const checked = selectedResourceIds.includes(resource.id);
                        return (
                          <label
                            key={resource.id}
                            className="flex items-center gap-2 border border-border rounded-md px-3 py-2"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleResourceSelection(resource.id, Boolean(value))
                              }
                            />
                            <div className="text-sm">
                              <div>{resource.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {resource.type} · {resource.id}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {form.formState.errors.selectedResourceIds ? (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.selectedResourceIds.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="booking-party-id">Booked by party id</Label>
                      <Input id="booking-party-id" {...form.register("bookedByPartyId")} />
                    </div>
                    <div>
                      <Label htmlFor="booking-booked-by-name">Booked by name</Label>
                      <Input id="booking-booked-by-name" {...form.register("bookedByName")} />
                    </div>
                    <div>
                      <Label htmlFor="booking-booked-by-email">Booked by email</Label>
                      <Input
                        id="booking-booked-by-email"
                        type="email"
                        {...form.register("bookedByEmail")}
                      />
                      {form.formState.errors.bookedByEmail ? (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.bookedByEmail.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service offering</Label>
                    <p className="text-sm mt-1">{bookingQuery.data?.serviceOfferingId || "-"}</p>
                  </div>
                  <div>
                    <Label>Allocated resources</Label>
                    <p className="text-sm mt-1">
                      {(bookingQuery.data?.allocations ?? []).length
                        ? bookingQuery.data?.allocations
                            ?.map((allocation) => allocation.resourceId)
                            .join(", ")
                        : "-"}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="booking-notes">Notes</Label>
                <Textarea id="booking-notes" rows={4} {...form.register("notes")} />
              </div>

              {isEdit ? (
                <div>
                  <Label htmlFor="booking-cancel-reason">Cancel reason (optional)</Label>
                  <Input id="booking-cancel-reason" {...form.register("cancelReason")} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
