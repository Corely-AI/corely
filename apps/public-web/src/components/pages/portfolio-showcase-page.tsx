import Link from "next/link";
import type {
  PortfolioShowcase,
  PortfolioProfile,
  PortfolioProject,
  PortfolioClient,
  PortfolioService,
  PortfolioTeamMember,
} from "@corely/contracts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buildWorkspacePath } from "@/lib/urls";

export function PortfolioShowcaseContent({
  showcase,
  profile,
  featuredProjects,
  featuredClients,
  featuredServices,
  featuredTeamMembers,
  workspaceSlug,
}: {
  showcase: PortfolioShowcase;
  profile: PortfolioProfile | null;
  featuredProjects: PortfolioProject[];
  featuredClients: PortfolioClient[];
  featuredServices: PortfolioService[];
  featuredTeamMembers: PortfolioTeamMember[];
  workspaceSlug?: string | null;
}) {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <Badge variant="secondary">Portfolio</Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {showcase.name}
        </h1>
        {profile?.headline ? (
          <p className="text-lg text-muted-foreground max-w-2xl">{profile.headline}</p>
        ) : null}
      </header>

      {profile?.aboutLong ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">About</h2>
          <p className="text-body text-muted-foreground">{profile.aboutLong}</p>
        </section>
      ) : null}

      {featuredProjects.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Featured projects</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredProjects.map((project) => (
              <Card key={project.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-body-sm text-muted-foreground">{project.summary}</p>
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={buildWorkspacePath(
                        `/portfolio/${showcase.slug}/projects/${project.slug}`,
                        workspaceSlug
                      )}
                    >
                      View project
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {featuredServices.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Services</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredServices.map((service) => (
              <Card key={service.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">{service.shortDescription}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {featuredClients.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Clients</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredClients.map((client) => (
              <Card key={client.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">{client.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {featuredTeamMembers.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Team</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredTeamMembers.map((member) => (
              <Card key={member.id} className="card-elevated">
                <CardHeader>
                  <CardTitle>{member.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">{member.roleTitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Button asChild variant="outline">
        <Link href={buildWorkspacePath("/portfolio", workspaceSlug)}>Back to portfolio</Link>
      </Button>
    </div>
  );
}
