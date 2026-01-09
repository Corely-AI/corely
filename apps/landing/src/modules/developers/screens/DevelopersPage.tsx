import { Seo } from "@/shared/seo/Seo";
import { Container } from "@/shared/components/Container";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function DevelopersPage() {
  return (
    <>
      <Seo
        title="Corely for developers - modular ERP architecture"
        description="Corely is built for developers: modular bounded contexts, contracts-first types, ports and adapters, and reliable event workflows. Extend modules without breaking core workflows."
        canonicalPath="/developers"
      />

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge variant="accent">Developer friendly</Badge>
              <div className="space-y-4">
                <h1 className="text-display">Extend Corely without breaking the kernel.</h1>
                <p className="text-body text-muted-foreground">
                  Corely is a modular monolith with clear boundaries, contracts-first types, and
                  ports and adapters. Add modules, swap providers, and hook into events with
                  confidence.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ variant: "accent", size: "lg" })}
                  href="#architecture"
                >
                  Read architecture
                </a>
                <a className={buttonVariants({ variant: "outline", size: "lg" })} href="#modules">
                  Browse modules
                </a>
                <a className={buttonVariants({ variant: "ghost", size: "lg" })} href="#integration">
                  Integration guide
                </a>
              </div>
            </div>
            <div className="card-elevated rounded-3xl border border-border bg-panel p-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Build with Corely
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground">
                  {`corely/
  apps/landing
  apps/web
  packages/contracts
  packages/kernel
  packages/domain
  packages/data
  packages/tooling`}
                </pre>
                <p className="text-sm text-muted-foreground">
                  Keep modules small, expose contracts, and keep adapters replaceable.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section id="architecture" className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Architecture"
            title="Core principles that keep the kernel stable."
            description="A calm architecture that starts as a modular monolith and scales to extracted services later."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Bounded contexts",
                body: "Modules align with domain boundaries to avoid cross-module coupling.",
              },
              {
                title: "Contracts-first types",
                body: "Public contracts stay explicit so changes are predictable.",
              },
              {
                title: "Ports and adapters",
                body: "Swap providers without rewriting workflows or tests.",
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

      <section id="modules" className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Modules"
            title="Add features without disrupting the rest."
            description="Each module ships with UI and API surfaces designed for isolation."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[
              {
                title: "Add a module",
                body: "Ship a new UI and API module with its own contract package.",
              },
              {
                title: "Extend workflows",
                body: "Hook into events with outbox patterns and safe retries.",
              },
              {
                title: "CQRS-lite reads",
                body: "Power dashboards with read models that stay in sync.",
              },
              {
                title: "Observability hooks",
                body: "Structured logs and tool execution traces stay consistent.",
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

      <section id="integration" className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Integrations"
            title="Plug in providers with clean adapters."
            description="Corely makes integrations predictable through ports, adapters, and event hooks."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Contracts package",
                body: "Define types once and reuse them across apps and services.",
              },
              {
                title: "Event hooks",
                body: "Trigger automations through outbox and workflow processors.",
              },
              {
                title: "Audit-friendly tools",
                body: "Tool execution logs keep integrations reviewable.",
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
