import { useBrowserLocale } from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/landing.json";
import { Link } from "react-router-dom";
import {
  Bot,
  Building2,
  FileText,
  Landmark,
  Layers,
  Receipt,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Seo } from "@/shared/seo/Seo";
import { JsonLd } from "@/shared/seo/JsonLd";
import { Container } from "@/shared/components/Container";
import { SectionHeading } from "@/shared/components/SectionHeading";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const faqItems = [
  {
    question: "What is an AI-native ERP?",
    answer:
      "An AI-native ERP combines core finance and operations data with tool-based automation. Corely pairs structured workflows with an AI copilot that works inside guardrails, so every action is auditable, repeatable, and tied to business data instead of free-form chat.",
  },
  {
    question: "How is Corely different from traditional ERP?",
    answer:
      "Corely brings connected apps into one workspace. Start with the capabilities you need and add apps through app management as your work grows.",
  },
  {
    question: "Can I use the same workspace on my own and with a team?",
    answer:
      "Yes. Solo operators and teams share the same workspace experience. Invite teammates, assign permissions, and activate the apps you need.",
  },
  {
    question: "Can I invite teammates later?",
    answer:
      "Yes. Invite teammates into your existing workspace and manage their access through roles and permissions.",
  },
  {
    question: "Is Corely developer-friendly and extensible?",
    answer:
      "Yes. Modules map to bounded contexts with contracts-first types and clear interfaces. A shared contracts package keeps UI and API types aligned. Ports and adapters make it easy to swap providers, while event and outbox patterns let you build integrations without breaking core workflows.",
  },
  {
    question: "How do automations and approvals work?",
    answer:
      "Corely uses workflow-driven automations with explicit approval steps. Actions are queued through an outbox for reliability, with audit trails and idempotent execution. This keeps approvals predictable and gives teams confidence that changes are tracked.",
  },
  {
    question: "Is Corely multi-tenant and secure by default?",
    answer:
      "Corely defaults to tenant scoping, audit logs, and idempotent operations. This keeps data separated, prevents accidental double actions, and makes compliance easier as you move from solo work to team workflows. Security defaults reduce custom policy work while keeping audits simple.",
  },
  {
    question: "Can I self-host or deploy on my own infrastructure?",
    answer:
      "Self-hosting is planned. The architecture is designed with clear boundaries and contracts so deployment options can expand over time, but the initial launch focuses on a managed cloud experience. Early access partners can help shape deployment options and priorities.",
  },
  {
    question: "Does Corely handle invoices, expenses, and taxes?",
    answer:
      "Yes. Activate invoicing, expenses, and tax apps when they support your work. Solo operators and teams use the same apps.",
  },
  {
    question: "How does the AI copilot stay auditable?",
    answer:
      "Corely uses tool-based copilot actions with structured logs. Every suggestion and execution step is recorded, linked to the underlying data, and visible in audit history. This avoids black-box automation while keeping workflows fast.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function HomePage() {
  const copy = messages[useBrowserLocale()];
  return (
    <>
      <Seo
        title="Corely - AI-native ERP for freelancers and SMBs"
        description="Corely connects your team's operations in one workspace. Choose the apps you need and invite teammates as you grow."
        canonicalPath="/"
      />
      <JsonLd id="faq" data={faqJsonLd} />

      <section className="relative overflow-hidden pb-16 pt-16 md:pt-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <Badge variant="accent">{copy.kernel}</Badge>
              <div className="text-sm font-medium text-muted-foreground">{copy.tagline}</div>
              <div className="space-y-4">
                <h1 className="text-display text-foreground">{copy.hero}</h1>
                <p className="text-body text-muted-foreground">{copy.intro}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ variant: "accent", size: "lg" })}
                  href="mailto:hello@corely.one"
                >
                  {copy.earlyAccess}
                </a>
                <a
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                  href="https://docs.corely.one"
                >
                  {copy.docs}
                </a>
                <a
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                  href="https://github.com/Corely-AI/corely"
                >
                  {copy.github}
                </a>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" />
                  {copy.modular}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  {copy.audit}
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-accent/20 via-transparent to-primary/10 blur-2xl" />
              <div className="relative card-elevated overflow-hidden rounded-3xl border border-border bg-panel p-6 shadow-card">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{copy.workspace}</span>
                    <span className="badge-accent">{copy.preview}</span>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">April revenue</p>
                          <p className="text-2xl font-semibold">EUR 18,420</p>
                        </div>
                        <div className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                          On track
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Approvals</p>
                        <p className="text-lg font-semibold">12 pending</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-xs text-muted-foreground">Automation</p>
                        <p className="text-lg font-semibold">5 workflows</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs text-muted-foreground">Copilot suggestions</p>
                      <p className="text-sm font-medium">"Remind Karo Studio about invoice #182"</p>
                      <div className="mt-3 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 w-2/3 rounded-full bg-accent" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="space-y-6">
              <SectionHeading
                title="Start with the apps you need."
                description="Use one workspace on your own or with a team. Add capabilities through app management as your work grows."
              />
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Choose the apps that support your day-to-day work.</li>
                <li>Invite teammates and manage access with roles and permissions.</li>
                <li>Connect finance apps when you need invoices, expenses, or taxes.</li>
              </ul>
              <Link className={buttonVariants({ variant: "outline" })} to="/company">
                Explore team workflows
              </Link>
            </div>
            <div className="rounded-3xl border border-border bg-panel p-6 shadow-card">
              <img
                src="/preview-company.svg"
                alt="Corely workspace preview"
                loading="lazy"
                className="w-full rounded-2xl border border-border bg-background"
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Core workflows"
            title="Finance basics, built for growth."
            description="Cover the essentials now and expand into richer workflows as your company grows."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-interactive">
              <CardHeader>
                <FileText className="h-6 w-6 text-accent" />
                <CardTitle>Invoices and payments</CardTitle>
                <CardDescription>
                  Send branded invoices, track payment status, and automate follow-ups.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <Receipt className="h-6 w-6 text-accent" />
                <CardTitle>Expenses and receipts</CardTitle>
                <CardDescription>
                  Capture receipts, categorize spend, and keep everything tax ready.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <Landmark className="h-6 w-6 text-accent" />
                <CardTitle>Taxes, now and later</CardTitle>
                <CardDescription>
                  Freelancer friendly tax snapshots that scale to compliance workflows.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <Workflow className="h-6 w-6 text-accent" />
                <CardTitle>Automations and approvals</CardTitle>
                <CardDescription>
                  Reliable workflows with outbox delivery for reminders and approvals.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <Bot className="h-6 w-6 text-accent" />
                <CardTitle>AI copilot</CardTitle>
                <CardDescription>
                  Tool-based automation with audit trails and safe execution.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-interactive">
              <CardHeader>
                <Building2 className="h-6 w-6 text-accent" />
                <CardTitle>Roles and permissions</CardTitle>
                <CardDescription>
                  Manage team access with roles, permissions, and approval workflows.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Developer friendly"
                title="Designed for clean boundaries and extensibility."
                description="Corely ships as a modular monolith with clear contracts, giving you the confidence to extend or extract later."
              />
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>Modules map to bounded contexts with contracts-first types.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>Ports and adapters keep providers swappable and integrations clean.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>Event and outbox patterns keep automations reliable.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>CQRS-lite reads power dashboards without slowing writes.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                  <span>Local dev workflows stay mock-friendly for safe iteration.</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className={buttonVariants({ variant: "outline" })} to="/developers">
                  Developer details
                </Link>
                <a
                  className={buttonVariants({ variant: "ghost" })}
                  href="https://github.com/Corely-AI/corely"
                >
                  Browse modules
                </a>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Contracts-first types",
                  description: "Keep module boundaries explicit and predictable.",
                },
                {
                  title: "Ports and adapters",
                  description: "Swap providers without rewriting workflows.",
                },
                {
                  title: "Outbox workflows",
                  description: "Reliable automation delivery and retries.",
                },
                {
                  title: "Audit ready by default",
                  description: "Idempotency and tenant scoping built in.",
                },
              ].map((item) => (
                <Card key={item.title} className="card-interactive">
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="Social proof"
            title="Trusted by teams who want clarity."
            description="Logos and testimonials go here. We are collecting early partners now."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["Nordic Labs", "Tallink Studio", "Finbay", "Lumen Works"].map((logo) => (
              <div
                key={logo}
                className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-border bg-panel text-sm font-medium text-muted-foreground"
              >
                {logo}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading
            eyebrow="FAQ"
            title="Answers that work for search and for humans."
            description="Short, direct answers to the most common questions about Corely."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {faqItems.map((item) => (
              <Card key={item.question} className="card-interactive">
                <CardHeader>
                  <CardTitle>{item.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary/90 to-accent p-6 text-primary-foreground sm:p-8 lg:p-10">
            <div className="absolute inset-0 opacity-30" />
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-4">
                <h2 className="text-h2 text-primary-foreground">
                  Ready to run your business clearly?
                </h2>
                <p className="text-body text-primary-foreground/80">
                  Request early access and see how Corely moves with you from freelancer to company
                  mode.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className={buttonVariants({ variant: "secondary", size: "lg" })}
                  href="mailto:hello@corely.one"
                >
                  {copy.earlyAccess}
                </a>
                <Link
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                  to="/developers"
                >
                  Read architecture
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
