import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageSquare, UserPlus } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Label } from "@corely/ui";
import { Logo } from "@/shared/components/Logo";
import { formatDateLong, formatDateTime } from "@/shared/lib/formatters";
import {
  cmsApi,
  buildPublicFileUrl,
  buildCmsPostPublicLink,
  loadCmsReaderSession,
  saveCmsReaderSession,
  clearCmsReaderSession,
} from "@/lib/cms-api";
import { cmsPublicKeys } from "../queries";
import { toast } from "sonner";
import { usePublicWorkspace } from "@/shared/public-workspace";

const contentClass =
  "text-[15px] leading-7 text-foreground space-y-4 " +
  "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight " +
  "[&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold " +
  "[&_p]:text-foreground [&_ul]:list-disc [&_ol]:list-decimal " +
  "[&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground " +
  "[&_a]:text-accent [&_a]:underline [&_img]:rounded-md [&_img]:border [&_img]:border-border";

export default function PublicCmsPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = usePublicWorkspace();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}/cms` : "/cms";
  const queryClient = useQueryClient();
  const [session, setSession] = useState(loadCmsReaderSession());
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [commentBody, setCommentBody] = useState("");

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: cmsPublicKeys.post(workspaceSlug, slug),
    queryFn: () => (slug ? cmsApi.getPublicPost(slug) : Promise.resolve(null)),
    enabled: Boolean(slug),
  });

  const { data: commentsData } = useQuery({
    queryKey: cmsPublicKeys.comments(workspaceSlug, slug, { page: 1, pageSize: 50 }),
    queryFn: () =>
      slug ? cmsApi.listPublicComments(slug, { page: 1, pageSize: 50 }) : Promise.resolve(null),
    enabled: Boolean(slug),
  });

  const comments = commentsData?.items ?? [];

  const coverUrl = useMemo(
    () => (post?.coverImageFileId ? buildPublicFileUrl(post.coverImageFileId) : null),
    [post?.coverImageFileId]
  );

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!authEmail.trim() || !authPassword.trim()) {
        throw new Error("Email and password are required");
      }
      return authMode === "login"
        ? cmsApi.readerLogin({ email: authEmail.trim(), password: authPassword })
        : cmsApi.readerSignUp({
            email: authEmail.trim(),
            password: authPassword,
            displayName: authDisplayName.trim() || undefined,
          });
    },
    onSuccess: (result) => {
      const nextSession = { accessToken: result.accessToken, reader: result.reader };
      saveCmsReaderSession(nextSession);
      setSession(nextSession);
      setAuthPassword("");
      toast.success("Signed in");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to authenticate");
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !session?.accessToken) {
        throw new Error("Please sign in first");
      }
      if (!commentBody.trim()) {
        throw new Error("Comment cannot be empty");
      }
      return cmsApi.createPublicComment(
        slug,
        { bodyText: commentBody.trim() },
        session.accessToken
      );
    },
    onSuccess: async () => {
      setCommentBody("");
      toast.success("Comment submitted for review");
      await queryClient.invalidateQueries({
        queryKey: cmsPublicKeys.comments(workspaceSlug, slug, { page: 1, pageSize: 50 }),
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to submit comment");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={basePath} className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm text-muted-foreground">Articles</span>
          </Link>
          {post?.slug ? (
            <Link
              to={buildCmsPostPublicLink(post.slug, workspaceSlug)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Share link
            </Link>
          ) : null}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading post...</div>
        ) : isError || !post ? (
          <div className="text-center text-muted-foreground py-12">
            Post not found. <Link to={basePath}>Back to articles</Link>
          </div>
        ) : (
          <>
            <article className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {formatDateLong(post.publishedAt, "en-US")}
                </p>
                <h1 className="text-display text-foreground">{post.title}</h1>
                {post.excerpt ? (
                  <p className="text-lg text-muted-foreground">{post.excerpt}</p>
                ) : null}
              </div>
              {coverUrl ? (
                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={coverUrl} alt={post.title} className="w-full h-80 object-cover" />
                </div>
              ) : null}
              <div
                className={contentClass}
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />
            </article>

            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                <h2 className="text-h2 text-foreground">Comments</h2>
              </div>

              {session ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Signed in as {session.reader.displayName || session.reader.email}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearCmsReaderSession();
                          setSession(null);
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comment-body">Leave a comment</Label>
                      <Textarea
                        id="comment-body"
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        placeholder="Share your thoughts..."
                      />
                    </div>
                    <Button
                      variant="accent"
                      onClick={() => commentMutation.mutate()}
                      disabled={commentMutation.isPending}
                    >
                      Submit comment
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Comments are reviewed before appearing publicly.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-h3 text-foreground">
                        {authMode === "login" ? "Sign in to comment" : "Create an account"}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAuthMode((mode) => (mode === "login" ? "signup" : "login"))
                        }
                      >
                        <UserPlus className="h-4 w-4" />
                        {authMode === "login" ? "Sign up" : "Sign in"}
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      {authMode === "signup" ? (
                        <div className="space-y-2">
                          <Label htmlFor="display-name">Display name</Label>
                          <Input
                            id="display-name"
                            value={authDisplayName}
                            onChange={(event) => setAuthDisplayName(event.target.value)}
                            placeholder="Your name"
                          />
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label htmlFor="reader-email">Email</Label>
                        <Input
                          id="reader-email"
                          type="email"
                          value={authEmail}
                          onChange={(event) => setAuthEmail(event.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reader-password">Password</Label>
                        <Input
                          id="reader-password"
                          type="password"
                          value={authPassword}
                          onChange={(event) => setAuthPassword(event.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <Button
                        variant="accent"
                        onClick={() => authMutation.mutate()}
                        disabled={authMutation.isPending}
                      >
                        {authMode === "login" ? "Sign in" : "Create account"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No comments yet.</div>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="text-sm font-medium">
                          {comment.readerDisplayName || "Reader"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateTime(comment.createdAt, "en-US")}
                        </div>
                        <p className="text-sm">{comment.bodyText}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
