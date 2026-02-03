import Link from "next/link";
import type { PortfolioShowcase } from "@corely/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { buildWorkspacePath } from "@/lib/urls";

export function PortfolioListContent({
  showcases,
  workspaceSlug,
}: {
  showcases: PortfolioShowcase[];
  workspaceSlug?: string | null;
}) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Badge variant="secondary">Portfolio</Badge>
        <h1 className="text-h1">Featured work</h1>
        <p className="text-body text-muted-foreground">
          Explore highlights, services, and case studies curated by this workspace.
        </p>
      </header>

      {showcases.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold">No showcases yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Publish portfolio showcases to display them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {showcases.map((showcase) => (
            <Link
              key={showcase.id}
              href={buildWorkspacePath(`/portfolio/${showcase.slug}`, workspaceSlug)}
              className="group"
            >
              <Card className="card-elevated h-full transition-all duration-300 group-hover:-translate-y-1">
                <CardHeader>
                  <CardTitle>{showcase.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-body-sm text-muted-foreground">
                    {showcase.type === "company"
                      ? "Company showcase"
                      : showcase.type === "hybrid"
                        ? "Hybrid showcase"
                        : "Individual showcase"}
                  </p>
                  {showcase.primaryDomain ? (
                    <span className="text-xs text-muted-foreground">{showcase.primaryDomain}</span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
