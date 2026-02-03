import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import type { CmsPublicPostDto } from "@corely/contracts";
import { formatDate, estimateReadTime } from "@/lib/format";
import { buildPublicFileUrl } from "@/lib/public-api";
import { AnswerBlock } from "@/components/sections/answer-block";
import { FaqBlock, type FaqItem } from "@/components/sections/faq-block";
import { buildWorkspacePath } from "@/lib/urls";

export function BlogPostContent({
  post,
  workspaceSlug,
  summary,
  bullets,
  faqs,
}: {
  post: CmsPublicPostDto;
  workspaceSlug?: string | null;
  summary: string;
  bullets: string[];
  faqs: FaqItem[];
}) {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Blog</Badge>
          {post.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>{formatDate(post.publishedAt)}</span>
          <span>•</span>
          <span>{estimateReadTime(post.contentText)}</span>
        </div>
        {post.coverImageFileId ? (
          <div className="aspect-[16/9] rounded-3xl overflow-hidden bg-muted">
            <img
              src={buildPublicFileUrl(post.coverImageFileId)}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </header>

      <AnswerBlock summary={summary} bullets={bullets} />

      <div
        className="prose prose-lg max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-accent prose-img:rounded-2xl"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {faqs.length > 0 ? <FaqBlock items={faqs} /> : null}

      <div className="pt-6 border-t border-border/60 flex justify-between items-center">
        <Button asChild variant="outline">
          <Link href={buildWorkspacePath("/blog", workspaceSlug)}>Back to blog</Link>
        </Button>
      </div>
    </article>
  );
}
