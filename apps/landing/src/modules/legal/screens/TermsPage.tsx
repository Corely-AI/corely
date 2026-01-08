import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";

export function TermsPage() {
  return (
    <>
      <Seo
        title="Corely Terms of Service"
        description="Read the Corely terms of service."
        canonicalPath="/terms"
        noIndex
      />
      <section className="py-16">
        <Container>
          <div className="space-y-4">
            <h1 className="text-h1">Terms of Service</h1>
            <p className="text-body text-muted-foreground">
              This is a placeholder terms page. The final terms will define service usage, billing,
              and legal obligations.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
