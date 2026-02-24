import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import type { CreateResourceInput, ResourceType, WeeklyScheduleSlot } from "@corely/contracts";
import { z } from "zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingResourceKeys } from "../queries";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
  TimezoneSelect,
} from "@corely/ui";

const RESOURCE_TYPES: ResourceType[] = ["STAFF", "ROOM", "EQUIPMENT"];
const WEEK_DAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 0, label: "Sunday" },
];

type DayScheduleState = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type AvailabilityFormState = Record<number, DayScheduleState>;

const resourceFormSchema = z.object({
  type: z.enum(["STAFF", "ROOM", "EQUIPMENT"]),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  capacity: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), {
      message: "Capacity must be a positive integer",
    }),
  tagsText: z.string().optional(),
  attributesText: z
    .string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === "") {
        return true;
      }
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, "Attributes must be a valid JSON object"),
  isActive: z.boolean().default(true),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const DEFAULT_VALUES: ResourceFormValues = {
  type: "STAFF",
  name: "",
  description: "",
  location: "",
  capacity: "",
  tagsText: "",
  attributesText: "",
  isActive: true,
};

const toOptionalInt = (value: string | undefined) => {
  if (!value || value.trim() === "") {
    return undefined;
  }
  return Number(value);
};

const toMinutes = (value: string): number => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
};

const createDefaultAvailabilityForm = (): AvailabilityFormState =>
  Object.fromEntries(
    WEEK_DAYS.map(({ dayOfWeek }) => [
      dayOfWeek,
      { enabled: false, startTime: "09:00", endTime: "17:00" },
    ])
  ) as AvailabilityFormState;

const toPayload = (values: ResourceFormValues): CreateResourceInput => ({
  type: values.type,
  name: values.name.trim(),
  description: values.description?.trim() ? values.description.trim() : undefined,
  location: values.location?.trim() ? values.location.trim() : undefined,
  capacity: toOptionalInt(values.capacity),
  tags: values.tagsText
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
  attributes: values.attributesText?.trim() ? JSON.parse(values.attributesText) : undefined,
  isActive: values.isActive,
});

export default function ResourceEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const resourceQuery = useQuery({
    queryKey: id ? bookingResourceKeys.detail(id) : ["booking/resources", "new"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing resource id");
      }
      return bookingApi.getResource(id);
    },
    enabled: isEdit,
  });

  const [availabilityTimezone, setAvailabilityTimezone] = useState("UTC");
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>(
    createDefaultAvailabilityForm()
  );

  const availabilityRange = useMemo(() => {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 1);
    const to = new Date();
    to.setUTCDate(to.getUTCDate() + 35);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, []);

  const availabilityQuery = useQuery({
    queryKey: id
      ? ["booking/availability", id, availabilityRange.from, availabilityRange.to]
      : ["booking/availability", "new"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing resource id");
      }
      return bookingApi.getAvailability({
        resourceId: id,
        from: availabilityRange.from,
        to: availabilityRange.to,
      });
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (!resourceQuery.data) {
      return;
    }

    form.reset({
      type: resourceQuery.data.type,
      name: resourceQuery.data.name,
      description: resourceQuery.data.description ?? "",
      location: resourceQuery.data.location ?? "",
      capacity:
        typeof resourceQuery.data.capacity === "number" ? String(resourceQuery.data.capacity) : "",
      tagsText: (resourceQuery.data.tags ?? []).join(", "),
      attributesText: resourceQuery.data.attributes
        ? JSON.stringify(resourceQuery.data.attributes, null, 2)
        : "",
      isActive: resourceQuery.data.isActive,
    });
  }, [form, resourceQuery.data]);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const rule = availabilityQuery.data?.rule;
    if (!rule) {
      setAvailabilityTimezone("UTC");
      setAvailabilityForm(createDefaultAvailabilityForm());
      return;
    }

    const nextState = createDefaultAvailabilityForm();
    rule.weeklySlots.forEach((slot) => {
      nextState[slot.dayOfWeek] = {
        enabled: true,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
    });

    setAvailabilityTimezone(rule.timezone || "UTC");
    setAvailabilityForm(nextState);
  }, [availabilityQuery.data, isEdit]);

  const saveMutation = useMutation({
    mutationFn: async (values: ResourceFormValues) => {
      const payload = toPayload(values);
      if (id) {
        return bookingApi.updateResource(id, payload);
      }
      return bookingApi.createResource(payload);
    },
    onSuccess: async (result) => {
      const savedId = result.resource.id;
      toast.success(isEdit ? "Resource updated" : "Resource created");
      await invalidateResourceQueries(queryClient, "booking/resources", { id: savedId });
      navigate(`/booking/resources/${savedId}`);
    },
    onError: (error) => {
      const validationErrors = mapValidationErrorsToForm(error);
      Object.entries(validationErrors).forEach(([field, message]) => {
        if (field in DEFAULT_VALUES) {
          form.setError(field as keyof ResourceFormValues, { message });
        }
      });

      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to save resource");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing resource id");
      }
      await bookingApi.deleteResource(id);
    },
    onSuccess: async () => {
      toast.success("Resource deleted");
      await invalidateResourceQueries(queryClient, "booking/resources");
      navigate("/booking/resources");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to delete resource");
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing resource id");
      }

      const weeklySlots: WeeklyScheduleSlot[] = WEEK_DAYS.filter(
        ({ dayOfWeek }) => availabilityForm[dayOfWeek]?.enabled
      ).map(({ dayOfWeek }) => ({
        dayOfWeek,
        startTime: availabilityForm[dayOfWeek].startTime,
        endTime: availabilityForm[dayOfWeek].endTime,
      }));

      if (weeklySlots.length === 0) {
        throw new Error("Select at least one day in the weekly schedule.");
      }

      for (const slot of weeklySlots) {
        if (toMinutes(slot.endTime) <= toMinutes(slot.startTime)) {
          throw new Error("End time must be after start time for each selected day.");
        }
      }

      return bookingApi.upsertAvailabilityRule(id, {
        timezone: availabilityTimezone.trim() || "UTC",
        weeklySlots,
        blackouts: [],
      });
    },
    onSuccess: async () => {
      toast.success("Availability updated");
      await availabilityQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to update availability");
    },
  });

  const updateAvailabilityDay = (dayOfWeek: number, patch: Partial<DayScheduleState>) => {
    setAvailabilityForm((previous) => ({
      ...previous,
      [dayOfWeek]: {
        ...previous[dayOfWeek],
        ...patch,
      },
    }));
  };

  const pageTitle = useMemo(() => (isEdit ? "Edit resource" : "Create resource"), [isEdit]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/resources")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure resource type, capacity, tags, and booking metadata.
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
              title="Delete resource"
              description="This action cannot be undone."
              isLoading={deleteMutation.isPending}
              onConfirm={async () => {
                await deleteMutation.mutateAsync();
              }}
            />
          ) : null}
          <Button
            variant="outline"
            onClick={() =>
              navigate(isEdit && id ? `/booking/resources/${id}` : "/booking/resources")
            }
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

      {isEdit && resourceQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading resource...
          </CardContent>
        </Card>
      ) : null}

      {isEdit && resourceQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load resource.</div>
            <Button variant="outline" size="sm" onClick={() => void resourceQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(!isEdit || resourceQuery.data) && !resourceQuery.isError ? (
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <Label htmlFor="resource-type">Type</Label>
                <select
                  id="resource-type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.watch("type")}
                  onChange={(event) =>
                    form.setValue("type", event.target.value as ResourceType, {
                      shouldValidate: true,
                    })
                  }
                >
                  {RESOURCE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="resource-name">Name</Label>
                <Input id="resource-name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="resource-description">Description</Label>
                <Textarea id="resource-description" rows={3} {...form.register("description")} />
                {form.formState.errors.description ? (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resource-location">Location</Label>
                  <Input id="resource-location" {...form.register("location")} />
                  {form.formState.errors.location ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.location.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="resource-capacity">Capacity</Label>
                  <Input
                    id="resource-capacity"
                    type="number"
                    min={1}
                    {...form.register("capacity")}
                  />
                  {form.formState.errors.capacity ? (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.capacity.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="resource-tags">Tags (comma-separated)</Label>
                <Input
                  id="resource-tags"
                  placeholder="senior, surgery, projector"
                  {...form.register("tagsText")}
                />
              </div>

              <div>
                <Label htmlFor="resource-attributes">Attributes JSON</Label>
                <Textarea
                  id="resource-attributes"
                  rows={8}
                  placeholder='{"floor": 3, "zone": "A"}'
                  {...form.register("attributesText")}
                />
                {form.formState.errors.attributesText ? (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.attributesText.message}
                  </p>
                ) : null}
              </div>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", Boolean(checked), { shouldDirty: true })
                  }
                />
                <span className="text-sm">Resource is active</span>
              </label>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Type: {form.watch("type")}</Badge>
                <Badge variant={form.watch("isActive") ? "default" : "outline"}>
                  {form.watch("isActive") ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {isEdit && !resourceQuery.isError ? (
        <Card id="availability">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Availability</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure weekly time windows used for public booking slots.
                </p>
              </div>
              <Button
                variant="accent"
                onClick={() => saveAvailabilityMutation.mutate()}
                disabled={availabilityQuery.isLoading || saveAvailabilityMutation.isPending}
              >
                {saveAvailabilityMutation.isPending ? "Saving..." : "Save availability"}
              </Button>
            </div>

            {availabilityQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading availability...</p>
            ) : availabilityQuery.isError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-destructive">Failed to load availability rule.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void availabilityQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="max-w-xs">
                  <Label htmlFor="availability-timezone">Timezone</Label>
                  <TimezoneSelect
                    id="availability-timezone"
                    value={availabilityTimezone}
                    onChange={setAvailabilityTimezone}
                  />
                </div>

                <div className="space-y-3">
                  {WEEK_DAYS.map(({ dayOfWeek, label }) => {
                    const row = availabilityForm[dayOfWeek];
                    return (
                      <div
                        key={dayOfWeek}
                        className="grid grid-cols-1 md:grid-cols-[180px_140px_140px] items-center gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={row.enabled}
                            onCheckedChange={(checked) =>
                              updateAvailabilityDay(dayOfWeek, { enabled: Boolean(checked) })
                            }
                          />
                          <span className="text-sm font-medium">{label}</span>
                        </label>

                        <Input
                          type="time"
                          value={row.startTime}
                          disabled={!row.enabled}
                          onChange={(event) =>
                            updateAvailabilityDay(dayOfWeek, { startTime: event.target.value })
                          }
                        />
                        <Input
                          type="time"
                          value={row.endTime}
                          disabled={!row.enabled}
                          onChange={(event) =>
                            updateAvailabilityDay(dayOfWeek, { endTime: event.target.value })
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: this editor supports one time window per day and no blackout periods.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
