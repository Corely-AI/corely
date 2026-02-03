import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

const sections = [
  {
    title: "Portfolio",
    description: "Showcase projects, services, and team highlights.",
    href: "/portfolio",
  },
  {
    title: "Rentals",
    description: "Public rental listings with rich property details.",
    href: "/rentals",
  },
  {
    title: "Blog",
    description: "Published CMS posts and product updates.",
    href: "/blog",
  },
];

export function HomePage() {
  const workspaceSlug = useWorkspaceSlug();

  return (
    <div className="space-y-12">
      <Seo
        title="Corely Public"
        description="Public-facing pages for portfolios, rentals, blog, and CMS content."
        canonicalPath={buildWorkspacePath("/", workspaceSlug)}
      />
      <section className="space-y-6">
        <Badge variant="secondary">Public Web</Badge>
        <h1 className="text-display">Make your workspace visible to the world.</h1>
        <p className="text-body text-muted-foreground max-w-2xl">
          This public surface is built for SEO-friendly portfolio pages, rental listings, and CMS
          content. Connect it to a workspace slug or custom domain to publish instantly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="accent">
            <Link to={buildWorkspacePath("/portfolio", workspaceSlug)}>View Portfolio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={buildWorkspacePath("/rentals", workspaceSlug)}>Browse Rentals</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="card-elevated">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-body-sm text-muted-foreground">{section.description}</p>
              <Button asChild size="sm" variant="secondary">
                <Link to={buildWorkspacePath(section.href, workspaceSlug)}>Explore</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
