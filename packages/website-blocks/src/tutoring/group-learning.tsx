import React from "react";
import { sectionClass, type TutoringGroupLearningViewProps } from "./shared";

export const TutoringGroupLearningView = (props: TutoringGroupLearningViewProps) => (
  <section
    id={props.anchorId ?? "dung-hoc-1-1"}
    className={sectionClass(props, "py-16 md:py-24 bg-gradient-to-b from-background to-accent/20")}
  >
    <div className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
          <span>✨</span>
          <span>Phương pháp đặc biệt tại Deutsch Liebe</span>
        </div>
        <h2 className="mb-6 text-3xl font-extrabold leading-tight text-foreground md:text-5xl">
          {props.heading}
        </h2>
        <p className="mx-auto max-w-2xl text-xl font-medium text-muted-foreground">
          {props.summary}
        </p>
      </div>

      <div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
            <h3 className="mb-4 text-2xl font-bold">Hơn cả một lớp học</h3>
            <ul className="space-y-3">
              {props.communityPoints.map((point, index) => (
                <li key={point} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-foreground">{point}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-center font-medium italic text-foreground/80">
              "Cả lớp học nhóm – luyện nói – sửa lỗi – động viên nhau mỗi ngày."
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h4 className="mb-4 text-lg font-bold text-muted-foreground">
              Vì sao không chỉ học 1:1?
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {props.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
          <div className="pt-4">
            <h4 className="mb-2 text-lg font-bold">Học ngoại ngữ là để:</h4>
            <div className="flex flex-wrap gap-2">
              {props.labels.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-accent-foreground/10 bg-accent px-3 py-1 text-sm font-medium"
                >
                  ✅ {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-foreground p-8 text-center text-background md:p-12">
        <h3 className="mb-6 text-2xl font-bold md:text-3xl">{props.closingHeading}</h3>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed opacity-90">
          {props.closingBody}
        </p>
        <a
          href={props.ctaHref}
          className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-secondary px-8 py-3 text-base font-bold text-secondary-foreground"
        >
          {props.ctaLabel}
        </a>
        <p className="mt-8 text-sm uppercase tracking-wide opacity-60">{props.footerQuote}</p>
      </div>
    </div>
  </section>
);
