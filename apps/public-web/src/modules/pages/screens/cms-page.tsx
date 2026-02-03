import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function CmsPage() {
  const { slug } = useParams();
  const workspaceSlug = useWorkspaceSlug();

  const query = useQuery({
    queryKey: ["pages", slug, workspaceSlug],
    queryFn: () => publicApi.getPage(slug ?? "", workspaceSlug),
    enabled: Boolean(slug),
  });

  if (!slug) {
    return <EmptyState title="Missing page" description="Please select a CMS page." />;
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
    return <EmptyState title="Page unavailable" description="Please try again later." />;
  }

  const post = query.data.post;

  return (
    <article className="space-y-6">
      <Seo
        title={post.title}
        description={post.excerpt ?? post.contentText.slice(0, 160)}
        canonicalPath={buildWorkspacePath(`/pages/${post.slug}`, workspaceSlug)}
      />

      <div className="space-y-2">
        <Badge variant="secondary">Page</Badge>
        <h1 className="text-h1">{post.title}</h1>
      </div>

      {post.contentHtml ? (
        <div
          className="text-body text-muted-foreground space-y-4"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      ) : null}

      <Button asChild variant="outline">
        <Link to={buildWorkspacePath("/", workspaceSlug)}>Back to home</Link>
      </Button>
    </article>
  );
}
