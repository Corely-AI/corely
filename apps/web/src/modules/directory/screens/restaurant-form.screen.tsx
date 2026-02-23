import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "@corely/api-client";
import {
  CreateAdminDirectoryRestaurantRequestSchema,
  DIRECTORY_ERROR_CODES,
  UpdateAdminDirectoryRestaurantRequestSchema,
  type ValidationErrorItem,
} from "@corely/contracts";
import { Button, Card, CardContent } from "@corely/ui";
import { toast } from "sonner";
import {
  getApiErrorDetail,
  useAdminDirectoryRestaurant,
  useCreateAdminDirectoryRestaurant,
  useUpdateAdminDirectoryRestaurant,
} from "../hooks/use-admin-directory-restaurants";
import { RestaurantForm, type RestaurantFormValues } from "../components/restaurant-form";

const mapValidationErrors = (issues: ValidationErrorItem[] | undefined) => {
  const result: Partial<Record<keyof RestaurantFormValues, string>> = {};
  if (!issues) {
    return result;
  }

  for (const issue of issues) {
    const field = issue.members?.[0] as keyof RestaurantFormValues | undefined;
    if (!field || result[field]) {
      continue;
    }

    if (
      field === "openingHoursJson" ||
      field === "slug" ||
      field === "name" ||
      field === "addressLine" ||
      field === "postalCode" ||
      field === "dishTags" ||
      field === "website"
    ) {
      result[field] = issue.message;
    }
  }

  return result;
};

const parsePayload = (values: RestaurantFormValues) => {
  const lat = values.lat.trim().length > 0 ? Number(values.lat) : null;
  const lng = values.lng.trim().length > 0 ? Number(values.lng) : null;

  if (values.lat.trim().length > 0 && Number.isNaN(lat)) {
    throw new Error("Latitude must be a valid number");
  }
  if (values.lng.trim().length > 0 && Number.isNaN(lng)) {
    throw new Error("Longitude must be a valid number");
  }

  let openingHoursJson: Record<string, string[]> | null = null;
  if (values.openingHoursJson.trim().length > 0) {
    try {
      openingHoursJson = JSON.parse(values.openingHoursJson) as Record<string, string[]>;
    } catch {
      throw new Error("Opening hours JSON is invalid");
    }
  }

  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    status: values.status,
    shortDescription: values.shortDescription.trim() || null,
    addressLine: values.addressLine.trim(),
    postalCode: values.postalCode.trim(),
    city: values.city.trim() || "Berlin",
    neighborhoodSlug: values.neighborhoodSlug.trim() || null,
    dishTags: values.dishTags,
    phone: values.phone.trim() || null,
    website: values.website.trim() || null,
    lat,
    lng,
    openingHoursJson,
  };
};

export default function RestaurantFormScreen() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAdminDirectoryRestaurant(id);
  const createMutation = useCreateAdminDirectoryRestaurant();
  const updateMutation = useUpdateAdminDirectoryRestaurant();

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RestaurantFormValues, string>>
  >({});

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const initialValues = useMemo(() => data?.restaurant, [data?.restaurant]);

  const onCancel = () => {
    if (isEdit && id) {
      navigate(`/directory/restaurants/${id}`);
      return;
    }
    navigate("/directory/restaurants");
  };

  const onSubmit = async (values: RestaurantFormValues) => {
    setFieldErrors({});

    try {
      const payload = parsePayload(values);

      if (isEdit && id) {
        const patch = UpdateAdminDirectoryRestaurantRequestSchema.parse(payload);
        const response = await updateMutation.mutateAsync({ id, patch });
        toast.success("Restaurant updated");
        navigate(`/directory/restaurants/${response.restaurant.id}`);
      } else {
        const input = CreateAdminDirectoryRestaurantRequestSchema.parse(payload);
        const response = await createMutation.mutateAsync(input);
        toast.success("Restaurant created");
        navigate(`/directory/restaurants/${response.restaurant.id}`);
      }
    } catch (submitError) {
      if (submitError instanceof z.ZodError) {
        const mapped: Partial<Record<keyof RestaurantFormValues, string>> = {};
        for (const issue of submitError.issues) {
          const field = issue.path[0] as keyof RestaurantFormValues | undefined;
          if (field && !mapped[field]) {
            mapped[field] = issue.message;
          }
        }
        setFieldErrors(mapped);
        toast.error("Please fix validation errors");
        return;
      }

      if (submitError instanceof ApiError) {
        if (submitError.code === DIRECTORY_ERROR_CODES.SLUG_ALREADY_EXISTS) {
          setFieldErrors((prev) => ({
            ...prev,
            slug: "Slug already exists",
          }));
        } else {
          setFieldErrors((prev) => ({
            ...prev,
            ...mapValidationErrors(submitError.validationErrors),
          }));
        }

        toast.error(submitError.detail);
        return;
      }

      if (submitError instanceof Error) {
        if (submitError.message.includes("Opening hours JSON")) {
          setFieldErrors((prev) => ({
            ...prev,
            openingHoursJson: submitError.message,
          }));
        }
        if (submitError.message.includes("Latitude")) {
          setFieldErrors((prev) => ({
            ...prev,
            lat: submitError.message,
          }));
        }
        if (submitError.message.includes("Longitude")) {
          setFieldErrors((prev) => ({
            ...prev,
            lng: submitError.message,
          }));
        }
      }

      toast.error(getApiErrorDetail(submitError));
    }
  };

  if (isEdit && isLoading) {
    return <div className="p-8 text-muted-foreground">Loading restaurant...</div>;
  }

  if (isEdit && isError) {
    return (
      <div className="space-y-3 p-8">
        <p className="text-sm text-destructive">{getApiErrorDetail(error)}</p>
        <Button variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
          {isRefetching ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-h1 text-foreground">{isEdit ? "Edit restaurant" : "Add restaurant"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? "Update restaurant information for the public directory."
            : "Create a new restaurant entry for the public directory."}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <RestaurantForm
            initialValues={initialValues}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
            submitLabel={isEdit ? "Save changes" : "Create restaurant"}
            onSubmit={(formValues) => {
              void onSubmit(formValues);
            }}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
