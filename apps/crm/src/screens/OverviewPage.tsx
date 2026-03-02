import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";

const cards = [
  {
    title: "Assistant",
    description: "Use AI to summarize activity, draft follow-ups, and plan next steps.",
    href: "/assistant",
  },
  {
    title: "Deals",
    description: "Track pipeline opportunities and move deals through stages.",
    href: "/crm/deals",
  },
  {
    title: "Activities",
    description: "Manage calls, tasks, and follow-ups across your pipeline.",
    href: "/crm/activities",
  },
  {
    title: "Sequences",
    description: "Automate multi-step outreach and enrollment workflows.",
    href: "/crm/sequences",
  },
];

export const OverviewPage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM Overview</h1>
        <p className="text-sm text-muted-foreground">
          AI + CRM workspace focused on pipeline and relationships.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} to={card.href}>
            <Card className="h-full transition-colors hover:border-accent">
              <CardHeader>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-accent">Open</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
