import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function PortfolioProjectPage() {
  const { showcaseSlug, projectSlug } = useParams();
  const workspaceSlug = useWorkspaceSlug();

  const query = useQuery({
    queryKey: ["portfolio", "project", showcaseSlug, projectSlug, workspaceSlug],
    queryFn: () =>
      publicApi.getPortfolioProject(showcaseSlug ?? "", projectSlug ?? "", workspaceSlug),
    enabled: Boolean(showcaseSlug && projectSlug),
  });

  if (!showcaseSlug || !projectSlug) {
    return (
      <EmptyState
        title="Missing project"
        description="Please select a project from the portfolio showcase."
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
    return <EmptyState title="Project not available" description="Please try again later." />;
  }

  const { project } = query.data;

  return (
    <article className="space-y-6">
      <Seo
        title={`${project.title} | Portfolio`}
        description={project.summary}
        canonicalPath={buildWorkspacePath(
          `/portfolio/${showcaseSlug}/projects/${project.slug}`,
          workspaceSlug
        )}
      />

      <div className="space-y-2">
        <Badge variant="secondary">{project.type}</Badge>
        <h1 className="text-h1">{project.title}</h1>
        <p className="text-body text-muted-foreground max-w-2xl">{project.summary}</p>
      </div>

      <div className="text-body text-muted-foreground whitespace-pre-wrap">{project.content}</div>

      <Button asChild variant="outline">
        <Link to={buildWorkspacePath(`/portfolio/${showcaseSlug}`, workspaceSlug)}>
          Back to showcase
        </Link>
      </Button>
    </article>
  );
}
