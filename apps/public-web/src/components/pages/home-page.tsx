import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buildWorkspacePath } from "@/lib/urls";

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
    title: "CMS",
    description: "Published CMS posts and product updates.",
    href: "/cms",
  },
];

export function HomePageContent({ workspaceSlug }: { workspaceSlug?: string | null }) {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <Badge variant="secondary">Public Web</Badge>
        <h1 className="text-display">Make your workspace visible to the world.</h1>
        <p className="text-body text-muted-foreground max-w-2xl">
          This public surface is built for SEO-friendly portfolio pages, rental listings, and CMS
          content. Connect it to a workspace slug or custom domain to publish instantly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="accent">
            <Link href={buildWorkspacePath("/portfolio", workspaceSlug)}>View Portfolio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={buildWorkspacePath("/rentals", workspaceSlug)}>Browse Rentals</Link>
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
                <Link href={buildWorkspacePath(section.href, workspaceSlug)}>Explore</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
