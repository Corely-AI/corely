import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";

export function PrivacyPage() {
  return (
    <>
      <Seo
        title="Corely Privacy Policy"
        description="Read the Corely privacy policy."
        canonicalPath="/privacy"
        noIndex
      />
      <section className="py-16">
        <Container>
          <div className="space-y-4">
            <h1 className="text-h1">Privacy Policy</h1>
            <p className="text-body text-muted-foreground">
              This is a placeholder privacy policy. The final policy will describe data usage,
              retention, and security practices.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
