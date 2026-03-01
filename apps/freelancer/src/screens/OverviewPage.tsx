import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";

const cards = [
  {
    title: "Assistant",
    description: "Get help drafting invoices, expense summaries, and tax guidance.",
    href: "/assistant",
  },
  {
    title: "Clients",
    description: "Manage your client records and contact details.",
    href: "/clients",
  },
  {
    title: "Invoices",
    description: "Issue, track, and follow up on invoices.",
    href: "/invoices",
  },
  {
    title: "Expenses",
    description: "Capture expenses and keep your books up to date.",
    href: "/expenses",
  },
  {
    title: "Tax",
    description: "Review filings, payments, and tax documents.",
    href: "/tax",
  },
  {
    title: "Portfolio",
    description: "Maintain your showcase, projects, services, and team.",
    href: "/portfolio/showcases",
  },
];

export const OverviewPage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Your freelancer workspace shortcuts.</p>
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
