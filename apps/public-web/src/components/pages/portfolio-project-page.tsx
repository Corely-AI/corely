import Link from "next/link";
import type { PortfolioProject } from "@corely/contracts";
import { Badge, Button } from "@/components/ui";
import { buildWorkspacePath } from "@/lib/urls";

export function PortfolioProjectContent({
  project,
  showcaseSlug,
  workspaceSlug,
}: {
  project: PortfolioProject;
  showcaseSlug: string;
  workspaceSlug?: string | null;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Badge variant="secondary">Project</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{project.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">{project.summary}</p>
      </header>

      <div className="prose prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <p>{project.content}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {project.techStack.map((tech) => (
          <Badge key={tech} variant="outline">
            {tech}
          </Badge>
        ))}
      </div>

      <Button asChild variant="outline">
        <Link href={buildWorkspacePath(`/portfolio/${showcaseSlug}`, workspaceSlug)}>
          Back to showcase
        </Link>
      </Button>
    </article>
  );
}
