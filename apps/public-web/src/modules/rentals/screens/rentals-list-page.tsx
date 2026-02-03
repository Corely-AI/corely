import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function RentalsListPage() {
  const workspaceSlug = useWorkspaceSlug();
  const rentalsQuery = useQuery({
    queryKey: ["rentals", "list", workspaceSlug],
    queryFn: () => publicApi.listRentals({ workspaceSlug }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["rentals", "categories", workspaceSlug],
    queryFn: () => publicApi.listRentalCategories(workspaceSlug),
  });

  return (
    <div className="space-y-8">
      <Seo
        title="Rentals"
        description="Public rental listings."
        canonicalPath={buildWorkspacePath("/rentals", workspaceSlug)}
      />
      <header className="space-y-2">
        <Badge variant="secondary">Rentals</Badge>
        <h1 className="text-h1">Available stays</h1>
        <p className="text-body text-muted-foreground">
          Explore published rental properties for this workspace.
        </p>
      </header>

      {categoriesQuery.data?.length ? (
        <div className="flex flex-wrap gap-2">
          {categoriesQuery.data.map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {rentalsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="card-elevated">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rentalsQuery.error ? (
        <EmptyState
          title="Unable to load rentals"
          description="Please check your workspace slug or try again later."
        />
      ) : rentalsQuery.data && rentalsQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rentalsQuery.data.map((property) => (
            <Card key={property.id} className="card-elevated">
              <CardHeader>
                <CardTitle>{property.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {property.summary ? (
                  <p className="text-body-sm text-muted-foreground">{property.summary}</p>
                ) : null}
                <Link
                  className="text-sm font-medium text-primary hover:underline"
                  to={buildWorkspacePath(`/rentals/${property.slug}`, workspaceSlug)}
                >
                  View details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No rentals yet"
          description="Publish rental properties in the admin app to show them here."
        />
      )}
    </div>
  );
}
