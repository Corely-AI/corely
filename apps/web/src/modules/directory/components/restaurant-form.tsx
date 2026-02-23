import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge, Button, Input, Label, Textarea } from "@corely/ui";
import type { AdminDirectoryRestaurant, DirectoryRestaurantStatus } from "@corely/contracts";

export type RestaurantFormValues = {
  name: string;
  slug: string;
  status: DirectoryRestaurantStatus;
  shortDescription: string;
  addressLine: string;
  postalCode: string;
  city: string;
  neighborhoodSlug: string;
  dishTags: string[];
  phone: string;
  website: string;
  lat: string;
  lng: string;
  openingHoursJson: string;
};

type RestaurantFormProps = {
  initialValues?: Partial<AdminDirectoryRestaurant>;
  isSubmitting?: boolean;
  fieldErrors?: Partial<Record<keyof RestaurantFormValues, string>>;
  submitLabel?: string;
  onSubmit: (values: RestaurantFormValues) => void;
  onCancel: () => void;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const toInitialValues = (input?: Partial<AdminDirectoryRestaurant>): RestaurantFormValues => ({
  name: input?.name ?? "",
  slug: input?.slug ?? "",
  status: input?.status ?? "HIDDEN",
  shortDescription: input?.shortDescription ?? "",
  addressLine: input?.addressLine ?? "",
  postalCode: input?.postalCode ?? "",
  city: input?.city ?? "Berlin",
  neighborhoodSlug: input?.neighborhoodSlug ?? "",
  dishTags: input?.dishTags ?? [],
  phone: input?.phone ?? "",
  website: input?.website ?? "",
  lat: input?.lat !== null && input?.lat !== undefined ? String(input.lat) : "",
  lng: input?.lng !== null && input?.lng !== undefined ? String(input.lng) : "",
  openingHoursJson:
    input?.openingHoursJson !== null && input?.openingHoursJson !== undefined
      ? JSON.stringify(input.openingHoursJson, null, 2)
      : "",
});

export const RestaurantForm: React.FC<RestaurantFormProps> = ({
  initialValues,
  isSubmitting,
  fieldErrors,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const initial = useMemo(() => toInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState<RestaurantFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [dishTagInput, setDishTagInput] = useState("");

  useEffect(() => {
    setValues(initial);
    setSlugTouched(Boolean(initial.slug));
    setDishTagInput("");
  }, [initial]);

  const updateField = <K extends keyof RestaurantFormValues>(
    field: K,
    value: RestaurantFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const addDishTag = () => {
    const normalized = slugify(dishTagInput);
    if (!normalized || values.dishTags.includes(normalized)) {
      setDishTagInput("");
      return;
    }
    updateField("dishTags", [...values.dishTags, normalized]);
    setDishTagInput("");
  };

  const removeDishTag = (tag: string) => {
    updateField(
      "dishTags",
      values.dishTags.filter((item) => item !== tag)
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="restaurant-name">Name</Label>
          <Input
            id="restaurant-name"
            value={values.name}
            onChange={(event) => {
              const nextName = event.target.value;
              updateField("name", nextName);
              if (!slugTouched) {
                updateField("slug", slugify(nextName));
              }
            }}
            placeholder="Pho Bar Neukolln"
            required
          />
          {fieldErrors?.name ? (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurant-slug">Slug</Label>
          <Input
            id="restaurant-slug"
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(true);
              updateField("slug", slugify(event.target.value));
            }}
            placeholder="pho-bar-neukoelln"
            required
          />
          {fieldErrors?.slug ? (
            <p className="text-xs text-destructive">{fieldErrors.slug}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurant-status">Status</Label>
          <select
            id="restaurant-status"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.status}
            onChange={(event) =>
              updateField("status", event.target.value as DirectoryRestaurantStatus)
            }
          >
            <option value="HIDDEN">HIDDEN</option>
            <option value="ACTIVE">ACTIVE</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="restaurant-short-description">Short description</Label>
          <Textarea
            id="restaurant-short-description"
            value={values.shortDescription}
            onChange={(event) => updateField("shortDescription", event.target.value)}
            placeholder="Small family-run Vietnamese kitchen in Neukolln"
            rows={3}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="restaurant-address">Address line</Label>
          <Input
            id="restaurant-address"
            value={values.addressLine}
            onChange={(event) => updateField("addressLine", event.target.value)}
            placeholder="Sonnenallee 105"
            required
          />
          {fieldErrors?.addressLine ? (
            <p className="text-xs text-destructive">{fieldErrors.addressLine}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurant-postal-code">Postal code</Label>
          <Input
            id="restaurant-postal-code"
            value={values.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            placeholder="12045"
            required
          />
          {fieldErrors?.postalCode ? (
            <p className="text-xs text-destructive">{fieldErrors.postalCode}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurant-city">City</Label>
          <Input
            id="restaurant-city"
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="Berlin"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="restaurant-neighborhood">Neighborhood slug</Label>
          <Input
            id="restaurant-neighborhood"
            value={values.neighborhoodSlug}
            onChange={(event) => updateField("neighborhoodSlug", slugify(event.target.value))}
            placeholder="neukoelln"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dish tags</Label>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2">
          {values.dishTags.map((tag) => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              <span>{tag}</span>
              <button
                type="button"
                className="inline-flex"
                onClick={() => removeDishTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <Input
              value={dishTagInput}
              onChange={(event) => setDishTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addDishTag();
                }
              }}
              placeholder="Type and press Enter"
            />
            <Button type="button" variant="outline" onClick={addDishTag}>
              Add
            </Button>
          </div>
        </div>
        {fieldErrors?.dishTags ? (
          <p className="text-xs text-destructive">{fieldErrors.dishTags}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="restaurant-phone">Phone</Label>
          <Input
            id="restaurant-phone"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+49 30 1234 5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurant-website">Website</Label>
          <Input
            id="restaurant-website"
            value={values.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://example.com"
          />
          {fieldErrors?.website ? (
            <p className="text-xs text-destructive">{fieldErrors.website}</p>
          ) : null}
        </div>
      </div>

      <details className="rounded-md border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Advanced fields</summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="restaurant-lat">Latitude</Label>
              <Input
                id="restaurant-lat"
                value={values.lat}
                onChange={(event) => updateField("lat", event.target.value)}
                placeholder="52.5200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant-lng">Longitude</Label>
              <Input
                id="restaurant-lng"
                value={values.lng}
                onChange={(event) => updateField("lng", event.target.value)}
                placeholder="13.4050"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restaurant-opening-hours">Opening hours JSON</Label>
            <Textarea
              id="restaurant-opening-hours"
              value={values.openingHoursJson}
              onChange={(event) => updateField("openingHoursJson", event.target.value)}
              rows={8}
              placeholder='{"mon":["11:00-22:00"]}'
            />
            {fieldErrors?.openingHoursJson ? (
              <p className="text-xs text-destructive">{fieldErrors.openingHoursJson}</p>
            ) : null}
          </div>
        </div>
      </details>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (submitLabel ?? "Save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
