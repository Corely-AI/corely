import { Badge, Button } from "@/components/ui";
import Link from "next/link";
import type { CmsPublicPostDto } from "@corely/contracts";
import { buildWorkspacePath } from "@/lib/urls";

export function CmsPageContent({
  page,
  workspaceSlug,
}: {
  page: CmsPublicPostDto;
  workspaceSlug?: string | null;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Badge variant="secondary">Page</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{page.title}</h1>
        {page.excerpt ? (
          <p className="text-lg text-muted-foreground max-w-2xl">{page.excerpt}</p>
        ) : null}
      </header>

      <div
        className="prose prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-accent prose-img:rounded-2xl"
        dangerouslySetInnerHTML={{ __html: page.contentHtml }}
      />

      <Button asChild variant="outline">
        <Link href={buildWorkspacePath("/", workspaceSlug)}>Back to home</Link>
      </Button>
    </article>
  );
}
