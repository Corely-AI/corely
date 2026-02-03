import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CompanyPage() {
  return (
    <>
      <Seo
        title="Corely for companies - roles, approvals, audit"
        description="Corely company mode adds roles, approvals, audit logs, and multi-entity readiness. Scale from freelancer workflows to teams, departments, and modular packs without rewriting."
        canonicalPath="/company"
      />

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge variant="accent">Company mode</Badge>
              <div className="space-y-4">
                <h1 className="text-display">Company workflows with clear governance.</h1>
                <p className="text-body text-muted-foreground">
                  Corely adds roles, approvals, and audit trails without forcing a rewrite. Start
                  with the same freelancer workflows, then unlock team controls, multi-entity
                  readiness, and modular packs.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ variant: "accent", size: "lg" })}
                  href="mailto:hello@corely.one"
                >
                  Request access
                </a>
                <a
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                  href="https://docs.corely.one"
                >
                  Read docs
                </a>
              </div>
            </div>
            <div className="card-elevated rounded-3xl border border-border bg-panel p-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Governance defaults
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Role-based access with fine-grained permissions.</li>
                  <li>Approval chains for expenses, invoices, and payouts.</li>
                  <li>Audit logs and idempotent operations by default.</li>
                  <li>Tenant scoping for multi-entity setups.</li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Upgrade path"
            title="Scale from freelancer to departments without disruption."
            description="Corely grows with your organization, adding capabilities in clear steps."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Freelancer",
                body: "Single workspace, invoices, expenses, tax visibility.",
              },
              {
                title: "Team",
                body: "Invite teammates, assign roles, share a single ledger.",
              },
              {
                title: "Departments",
                body: "Separate budgets, approvals, and workflows per group.",
              },
              {
                title: "Packs",
                body: "Add modules for purchasing, inventory, or CRM when needed.",
              },
            ].map((step) => (
              <Card key={step.title} className="card-interactive">
                <CardHeader>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Security defaults"
            title="Compliance ready without slowing teams."
            description="Corely keeps security and auditability on by default so teams can move quickly with confidence."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Tenant scoping",
                body: "Keep data separated across entities, workspaces, and departments.",
              },
              {
                title: "Audit trails",
                body: "Every action, approval, and automation stays logged and reviewable.",
              },
              {
                title: "Idempotent operations",
                body: "Avoid double actions and keep workflows reliable under load.",
              },
            ].map((item) => (
              <Card key={item.title} className="card-interactive">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
