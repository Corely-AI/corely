import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function PortfolioShowcasePage() {
  const { showcaseSlug } = useParams();
  const workspaceSlug = useWorkspaceSlug();

  const showcaseQuery = useQuery({
    queryKey: ["portfolio", "showcase", showcaseSlug, workspaceSlug],
    queryFn: () => publicApi.getPortfolioShowcase(showcaseSlug ?? "", workspaceSlug),
    enabled: Boolean(showcaseSlug),
  });

  const projectsQuery = useQuery({
    queryKey: ["portfolio", "projects", showcaseSlug, workspaceSlug],
    queryFn: () => publicApi.listPortfolioProjects(showcaseSlug ?? "", workspaceSlug),
    enabled: Boolean(showcaseSlug),
  });

  if (!showcaseSlug) {
    return (
      <EmptyState
        title="Missing showcase"
        description="Please select a portfolio showcase from the list."
      />
    );
  }

  if (showcaseQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (showcaseQuery.error || !showcaseQuery.data) {
    return (
      <EmptyState title="Showcase unavailable" description="We could not load this showcase." />
    );
  }

  const {
    showcase,
    profile,
    featuredProjects,
    featuredClients,
    featuredServices,
    featuredTeamMembers,
  } = showcaseQuery.data;

  const projects =
    projectsQuery.data?.items.length && projectsQuery.data.items.length > 0
      ? projectsQuery.data.items
      : featuredProjects;

  return (
    <div className="space-y-10">
      <Seo
        title={`${showcase.name} portfolio`}
        description={profile?.headline ?? profile?.aboutShort ?? "Portfolio showcase."}
        canonicalPath={buildWorkspacePath(`/portfolio/${showcase.slug}`, workspaceSlug)}
      />

      <header className="space-y-3">
        <Badge variant="secondary">{showcase.type}</Badge>
        <h1 className="text-h1">{showcase.name}</h1>
        {profile?.headline ? (
          <p className="text-body text-muted-foreground max-w-2xl">{profile.headline}</p>
        ) : null}
        {profile?.ctaUrl ? (
          <Button asChild variant="accent">
            <a href={profile.ctaUrl} target="_blank" rel="noreferrer">
              {profile.ctaText ?? "Get in touch"}
            </a>
          </Button>
        ) : null}
      </header>

      {profile?.aboutLong || profile?.aboutShort ? (
        <section className="space-y-3">
          <h2 className="text-h2">About</h2>
          <p className="text-body text-muted-foreground">
            {profile.aboutLong ?? profile.aboutShort}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-h2">Projects</h2>
        {projectsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
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
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-body-sm text-muted-foreground">{project.summary}</p>
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    to={buildWorkspacePath(
                      `/portfolio/${showcase.slug}/projects/${project.slug}`,
                      workspaceSlug
                    )}
                  >
                    View project
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No projects yet" description="Publish a project to show it here." />
        )}
      </section>

      {featuredServices.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-h2">Services</h2>
          <div className="flex flex-wrap gap-2">
            {featuredServices.map((service) => (
              <Badge key={service.id} variant="outline">
                {service.name}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {featuredClients.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-h2">Clients</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {featuredClients.map((client) => (
              <Card key={client.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-body-sm text-muted-foreground">
                  {client.summary ?? client.locationText}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {featuredTeamMembers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-h2">Team</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {featuredTeamMembers.map((member) => (
              <Card key={member.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{member.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-body-sm text-muted-foreground">
                  {member.roleTitle}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
