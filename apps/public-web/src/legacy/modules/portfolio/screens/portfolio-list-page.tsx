import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function PortfolioListPage() {
  const workspaceSlug = useWorkspaceSlug();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio", "showcases", workspaceSlug],
    queryFn: () => publicApi.listPortfolioShowcases({ workspaceSlug }),
  });

  return (
    <div className="space-y-8">
      <Seo
        title="Portfolio"
        description="Public portfolio showcases."
        canonicalPath={buildWorkspacePath("/portfolio", workspaceSlug)}
      />
      <header className="space-y-2">
        <Badge variant="secondary">Portfolio</Badge>
        <h1 className="text-h1">Showcases</h1>
        <p className="text-body text-muted-foreground">
          Discover featured showcases published by this workspace.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="card-elevated">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Unable to load portfolio"
          description="Please check the workspace slug or try again later."
        />
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((showcase) => (
            <Card key={showcase.id} className="card-elevated">
              <CardHeader>
                <CardTitle>{showcase.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline">{showcase.type}</Badge>
                <Link
                  className="text-sm font-medium text-primary hover:underline"
                  to={buildWorkspacePath(`/portfolio/${showcase.slug}`, workspaceSlug)}
                >
                  View showcase
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No showcases yet"
          description="Publish a showcase in the admin app to display it here."
        />
      )}
    </div>
  );
}
