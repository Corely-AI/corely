import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function FreelancerPage() {
  return (
    <>
      <Seo
        title="Corely for freelancers - invoices, expenses, taxes"
        description="Corely gives freelancers a calm, AI-native ERP: invoices, expenses, tax visibility, and client management. Start in minutes and scale to company mode when you grow."
        canonicalPath="/freelancer"
      />

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge variant="accent">Freelancer mode</Badge>
              <div className="space-y-4">
                <h1 className="text-display">Freelance finance, without the patchwork.</h1>
                <p className="text-body text-muted-foreground">
                  Corely keeps your invoices, expenses, and taxes in one place. It is built for solo
                  operators and stays focused until you are ready for a team.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ variant: "accent", size: "lg" })}
                  href="mailto:hello@corely.ai"
                >
                  Get early access
                </a>
                <a
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                  href="https://docs.corely.ai"
                >
                  Read docs
                </a>
              </div>
            </div>
            <div className="card-elevated rounded-3xl border border-border bg-panel p-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Freelancer essentials
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Invoice templates with payment status tracking.</li>
                  <li>Expense capture with receipt history.</li>
                  <li>Tax overview to plan quarterly payments.</li>
                  <li>Client profiles with project context.</li>
                  <li>Copilot assistance for follow-ups and summaries.</li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Start in minutes"
            title="From empty workspace to tax visibility in a single flow."
            description="Corely keeps the setup flow simple and linear so you can get paid faster."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              {
                title: "Create workspace",
                description: "Name your workspace and connect your billing preferences.",
              },
              {
                title: "Add client",
                description: "Store client details once and reuse them across projects.",
              },
              {
                title: "Send invoice",
                description: "Generate an invoice and track status automatically.",
              },
              {
                title: "Upload receipt",
                description: "Capture expenses with receipts and keep them categorized.",
              },
              {
                title: "Review tax snapshot",
                description: "See tax readiness with income, expenses, and projections.",
              },
            ].map((step, index) => (
              <Card key={step.title} className="card-interactive">
                <CardHeader>
                  <div className="text-xs text-muted-foreground">Step {index + 1}</div>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Why Corely"
            title="Replace spreadsheet chaos with a calm workflow."
            description="No more stitching together apps and email threads."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="card-interactive">
              <CardHeader>
                <CardTitle>Patchwork tools</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Invoices in one app, expenses in another.</li>
                  <li>Manual status tracking and late follow-ups.</li>
                  <li>Tax planning done in spreadsheets.</li>
                  <li>Client data scattered across tools.</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <CardTitle>Corely freelancer mode</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>One workflow for invoicing, expenses, and taxes.</li>
                  <li>Automated reminders and payment insights.</li>
                  <li>Tax snapshots ready for your accountant.</li>
                  <li>Clean upgrade path to team workflows.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
