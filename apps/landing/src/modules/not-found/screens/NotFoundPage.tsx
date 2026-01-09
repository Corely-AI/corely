import { Link } from "react-router-dom";
import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";
import { buttonVariants } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <>
      <Seo
        title="Page not found - Corely"
        description="The page you are looking for does not exist. Return to Corely home."
        canonicalPath="/404"
        noIndex
      />
      <section className="py-24">
        <Container>
          <div className="space-y-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              404
            </div>
            <h1 className="text-h1">This page does not exist.</h1>
            <p className="text-body text-muted-foreground">
              The link might be broken or the page has moved. Use the navigation or head back to the
              homepage.
            </p>
            <Link className={buttonVariants({ variant: "accent", size: "lg" })} to="/">
              Back to home
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
