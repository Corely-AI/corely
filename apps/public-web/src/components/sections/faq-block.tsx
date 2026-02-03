import React from "react";

export type FaqItem = {
  question: string;
  answer: string;
};

export function FaqBlock({ items }: { items: FaqItem[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">FAQ</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.question} className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
