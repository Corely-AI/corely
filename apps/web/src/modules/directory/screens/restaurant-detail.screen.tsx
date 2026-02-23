import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Pencil, EyeOff, Eye } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import { toast } from "sonner";
import { formatDateTime } from "@/shared/lib/formatters";
import {
  getApiErrorDetail,
  useAdminDirectoryRestaurant,
  useSetAdminDirectoryRestaurantStatus,
} from "../hooks/use-admin-directory-restaurants";

const statusVariant = (status: "ACTIVE" | "HIDDEN") => {
  return status === "ACTIVE" ? "success" : "muted";
};

const resolvePublicDirectoryBaseUrl = (): string => {
  const envBase = import.meta.env.VITE_RESTAURANT_LISTING_BASE_URL as string | undefined;
  if (envBase && envBase.length > 0) {
    return envBase.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

export default function RestaurantDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAdminDirectoryRestaurant(id);
  const setStatusMutation = useSetAdminDirectoryRestaurantStatus();

  const restaurant = data?.restaurant;

  const publicUrl = useMemo(() => {
    if (!restaurant) {
      return "";
    }
    return `${resolvePublicDirectoryBaseUrl()}/berlin/restaurants/${restaurant.slug}`;
  }, [restaurant]);

  const toggleStatus = async () => {
    if (!restaurant) {
      return;
    }
    try {
      await setStatusMutation.mutateAsync({
        id: restaurant.id,
        status: restaurant.status === "ACTIVE" ? "HIDDEN" : "ACTIVE",
      });
      toast.success(restaurant.status === "ACTIVE" ? "Restaurant hidden" : "Restaurant unhidden");
    } catch (mutationError) {
      toast.error(getApiErrorDetail(mutationError));
    }
  };

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading restaurant...</div>;
  }

  if (isError) {
    return (
      <div className="space-y-3 p-8">
        <p className="text-sm text-destructive">{getApiErrorDetail(error)}</p>
        <Button variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
          {isRefetching ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-8 text-muted-foreground">Restaurant not found.</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            <Link to="/directory/restaurants" className="hover:underline">
              Restaurants
            </Link>{" "}
            / {restaurant.name}
          </div>
          <h1 className="text-h1 text-foreground">{restaurant.name}</h1>
          <Badge variant={statusVariant(restaurant.status)}>{restaurant.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/directory/restaurants/${restaurant.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => void toggleStatus()}
            disabled={setStatusMutation.isPending}
          >
            {restaurant.status === "ACTIVE" ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {restaurant.status === "ACTIVE" ? "Hide" : "Unhide"}
          </Button>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Public link
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Overview</h2>
            <p className="text-sm text-muted-foreground">Slug: {restaurant.slug}</p>
            <p className="text-sm">Address: {restaurant.addressLine}</p>
            <p className="text-sm">
              Postal/City: {restaurant.postalCode} {restaurant.city}
            </p>
            <p className="text-sm">Neighborhood: {restaurant.neighborhoodSlug ?? "-"}</p>
            <p className="text-sm">Phone: {restaurant.phone ?? "-"}</p>
            <p className="text-sm">Website: {restaurant.website ?? "-"}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {restaurant.dishTags.length === 0 ? (
                <span className="text-sm text-muted-foreground">No dish tags</span>
              ) : (
                restaurant.dishTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Meta</h2>
            <p className="text-sm text-muted-foreground">ID: {restaurant.id}</p>
            <p className="text-sm text-muted-foreground">
              Updated: {formatDateTime(restaurant.updatedAt, "en-US")}
            </p>
            <p className="text-sm text-muted-foreground">
              Created: {formatDateTime(restaurant.createdAt, "en-US")}
            </p>
            {restaurant.shortDescription ? (
              <div>
                <h3 className="text-sm font-medium">Short description</h3>
                <p className="text-sm text-muted-foreground">{restaurant.shortDescription}</p>
              </div>
            ) : null}
            {restaurant.openingHoursJson ? (
              <div>
                <h3 className="text-sm font-medium">Opening hours JSON</h3>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(restaurant.openingHoursJson, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
