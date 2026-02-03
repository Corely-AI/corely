import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { CmsPostSummaryDto } from "@corely/contracts";
import { formatDate } from "@/lib/format";
import { buildPublicFileUrl } from "@/lib/public-api";
import { buildWorkspacePath } from "@/lib/urls";

export function BlogListContent({
  posts,
  workspaceSlug,
}: {
  posts: CmsPostSummaryDto[];
  workspaceSlug?: string | null;
}) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Badge variant="secondary">Blog</Badge>
        <h1 className="text-h1">Latest posts</h1>
        <p className="text-body text-muted-foreground">
          Stories, updates, and guides from this workspace.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Publish CMS posts to display them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={buildWorkspacePath(`/blog/${post.slug}`, workspaceSlug)}
              className="group"
            >
              <Card className="card-elevated h-full transition-all duration-300 group-hover:-translate-y-1">
                <CardHeader className="space-y-3">
                  {post.coverImageFileId ? (
                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-muted">
                      <img
                        src={buildPublicFileUrl(post.coverImageFileId)}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {post.excerpt ? (
                    <p className="text-body-sm text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(post.publishedAt)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
