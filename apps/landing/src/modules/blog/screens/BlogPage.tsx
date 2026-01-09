import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";

export function BlogPage() {
  return (
    <>
      <Seo
        title="Corely Blog"
        description="Corely updates and product notes."
        canonicalPath="/blog"
        noIndex
      />
      <section className="py-16">
        <Container>
          <div className="space-y-4">
            <h1 className="text-h1">Corely blog</h1>
            <p className="text-body text-muted-foreground">
              Blog posts are coming soon. This space will cover product updates, architecture notes,
              and operational insights for freelancers and teams.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
