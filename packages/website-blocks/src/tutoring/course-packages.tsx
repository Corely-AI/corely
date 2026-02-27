import React from "react";
import { sectionClass, type TutoringCoursePackagesViewProps } from "./shared";

export const TutoringCoursePackagesView = (props: TutoringCoursePackagesViewProps) => (
  <section id={props.anchorId ?? "packages"} className={sectionClass(props, "py-16 md:py-24")}>
    <div className="container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">{props.heading}</h2>
        <p className="mx-auto max-w-lg text-muted-foreground">{props.subheading}</p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {props.combos.map((combo) => (
          <div
            key={combo.title}
            className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
              combo.highlight ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
          >
            {combo.highlight ? (
              <div className="badge-gold absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold">
                ✨ Phổ biến nhất
              </div>
            ) : null}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-foreground">{combo.title}</h3>
              <p className="font-semibold text-primary">{combo.subtitle}</p>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {combo.sessions}
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              <strong>Phù hợp:</strong> {combo.suitableFor}
            </p>
            <ul className="mb-6 flex-1 space-y-2">
              {combo.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 shrink-0 text-primary">✓</span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
            <div className="mb-4 rounded-lg bg-accent/60 px-3 py-2 text-center">
              <span className="text-xs font-medium text-accent-foreground">
                Ưu đãi theo đợt — hỏi Trang để biết thêm
              </span>
            </div>
            <a
              href={props.ctaHref}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold ${
                combo.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-2 border-primary bg-primary/5 text-primary hover:bg-primary/10"
              }`}
            >
              {props.ctaLabel}
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);
