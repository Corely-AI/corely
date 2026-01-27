import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Logo } from "@/shared/components/Logo";
import { formatDate } from "@/shared/lib/formatters";
import { useCrudUrlState } from "@/shared/crud";
import { cmsApi, buildPublicFileUrl, buildCmsPostPublicLink } from "@/lib/cms-api";
import { cmsPublicKeys } from "../queries";

export default function PublicCmsListPage() {
  const [listState, setListState] = useCrudUrlState({ pageSize: 6 });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: cmsPublicKeys.posts({
      q: listState.q,
      page: listState.page,
      pageSize: listState.pageSize,
    }),
    queryFn: () =>
      cmsApi.listPublicPosts({
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
      }),
  });

  const posts = data?.items ?? [];

  const emptyState = (
    <EmptyState
      title="No articles yet"
      description="Check back soon for new content."
      action={
        <Button variant="outline" onClick={() => setListState({ page: 1 })}>
          Refresh
        </Button>
      }
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/p" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm text-muted-foreground">Articles</span>
          </Link>
          <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            Staff login
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-h1 text-foreground">Latest articles</h1>
            <p className="text-sm text-muted-foreground">
              Insights, updates, and guides from the Corely team.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts"
              className="pl-8"
              defaultValue={listState.q ?? ""}
              onChange={(event) => setListState({ q: event.target.value, page: 1 })}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading articles...</div>
        ) : isError ? (
          <div className="text-sm text-destructive">
            {(error as Error)?.message || "Failed to load posts"}
          </div>
        ) : posts.length === 0 ? (
          emptyState
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => {
              const coverUrl = post.coverImageFileId
                ? buildPublicFileUrl(post.coverImageFileId)
                : null;
              return (
                <Link key={post.id} to={buildCmsPostPublicLink(post.slug)}>
                  <Card className="h-full hover:shadow-md transition-shadow">
                    {coverUrl ? (
                      <div className="h-40 overflow-hidden rounded-t-lg bg-muted">
                        <img src={coverUrl} alt={post.title} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <CardContent className="p-5 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {post.publishedAt ? formatDate(post.publishedAt, "en-US") : "Draft"}
                      </div>
                      <h2 className="text-h3 text-foreground">{post.title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt ?? "No excerpt available."}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {data?.pageInfo ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Page {data.pageInfo.page} · {data.pageInfo.total} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={listState.page <= 1}
                onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.pageInfo.hasNextPage}
                onClick={() => setListState({ page: listState.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
