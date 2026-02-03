import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";
import { formatDate } from "@/shared/lib/format";

export function BlogPostPage() {
  const { slug } = useParams();
  const workspaceSlug = useWorkspaceSlug();

  const query = useQuery({
    queryKey: ["blog", "post", slug, workspaceSlug],
    queryFn: () => publicApi.getBlogPost(slug ?? "", workspaceSlug),
    enabled: Boolean(slug),
  });

  if (!slug) {
    return (
      <EmptyState title="Missing post" description="Please select a blog post from the list." />
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
    return <EmptyState title="Post unavailable" description="Please try again later." />;
  }

  const post = query.data.post;

  return (
    <article className="space-y-6">
      <Seo
        title={post.title}
        description={post.excerpt ?? post.contentText.slice(0, 160)}
        canonicalPath={buildWorkspacePath(`/blog/${post.slug}`, workspaceSlug)}
      />

      <div className="space-y-2">
        <Badge variant="secondary">Blog</Badge>
        <h1 className="text-h1">{post.title}</h1>
        <div className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</div>
      </div>

      {post.contentHtml ? (
        <div
          className="text-body text-muted-foreground space-y-4"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      ) : null}

      <Button asChild variant="outline">
        <Link to={buildWorkspacePath("/blog", workspaceSlug)}>Back to blog</Link>
      </Button>
    </article>
  );
}
