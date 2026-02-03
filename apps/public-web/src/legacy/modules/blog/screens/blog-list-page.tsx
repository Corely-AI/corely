import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { publicApi } from "@/shared/api/public-api";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";
import { formatDate } from "@/shared/lib/format";

export function BlogListPage() {
  const workspaceSlug = useWorkspaceSlug();
  const query = useQuery({
    queryKey: ["blog", "list", workspaceSlug],
    queryFn: () => publicApi.listBlogPosts({ workspaceSlug }),
  });

  return (
    <div className="space-y-8">
      <Seo
        title="Blog"
        description="Published posts from the Corely CMS."
        canonicalPath={buildWorkspacePath("/blog", workspaceSlug)}
      />
      <header className="space-y-2">
        <Badge variant="secondary">Blog</Badge>
        <h1 className="text-h1">Latest posts</h1>
        <p className="text-body text-muted-foreground">
          Stories, updates, and guides from this workspace.
        </p>
      </header>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
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
      ) : query.error ? (
        <EmptyState title="Unable to load posts" description="Please try again later." />
      ) : query.data && query.data.items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {query.data.items.map((post) => (
            <Card key={post.id} className="card-elevated">
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {post.excerpt ? (
                  <p className="text-body-sm text-muted-foreground">{post.excerpt}</p>
                ) : null}
                <div className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</div>
                <Link
                  className="text-sm font-medium text-primary hover:underline"
                  to={buildWorkspacePath(`/blog/${post.slug}`, workspaceSlug)}
                >
                  Read post
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No posts yet" description="Publish CMS posts to display them here." />
      )}
    </div>
  );
}
