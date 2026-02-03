import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function RentalDetailPage() {
  const { slug } = useParams();
  const workspaceSlug = useWorkspaceSlug();

  const query = useQuery({
    queryKey: ["rentals", "detail", slug, workspaceSlug],
    queryFn: () => publicApi.getRentalProperty(slug ?? "", workspaceSlug),
    enabled: Boolean(slug),
  });

  if (!slug) {
    return (
      <EmptyState
        title="Missing rental"
        description="Please select a property from the rentals list."
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return <EmptyState title="Property not available" description="Please try again later." />;
  }

  const property = query.data;

  return (
    <div className="space-y-6">
      <Seo
        title={`${property.name} | Rentals`}
        description={property.summary ?? "Rental property."}
        canonicalPath={buildWorkspacePath(`/rentals/${property.slug}`, workspaceSlug)}
      />

      <div className="space-y-2">
        <Badge variant="secondary">Rental</Badge>
        <h1 className="text-h1">{property.name}</h1>
        {property.summary ? (
          <p className="text-body text-muted-foreground max-w-2xl">{property.summary}</p>
        ) : null}
      </div>

      {property.descriptionHtml ? (
        <div
          className="text-body text-muted-foreground space-y-3"
          dangerouslySetInnerHTML={{ __html: property.descriptionHtml }}
        />
      ) : null}

      <Button asChild variant="outline">
        <Link to={buildWorkspacePath("/rentals", workspaceSlug)}>Back to rentals</Link>
      </Button>
    </div>
  );
}
