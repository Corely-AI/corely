import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import type { CreateResourceInput, ResourceType } from "@corely/contracts";
import { z } from "zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingResourceKeys } from "../queries";
import { mapValidationErrorsToForm } from "@/shared/lib/errors/map-validation-errors";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Checkbox, Input, Label, Textarea } from "@corely/ui";

const RESOURCE_TYPES: ResourceType[] = ["STAFF", "ROOM", "EQUIPMENT"];

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
    </div>
  );
}
