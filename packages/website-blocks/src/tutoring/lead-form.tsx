"use client";

import React from "react";
import { sectionClass, type TutoringLeadFormViewProps } from "./shared";

export const TutoringLeadFormView = (props: TutoringLeadFormViewProps) => {
  const [submitted, setSubmitted] = React.useState(false);
  const [consent, setConsent] = React.useState(false);

  if (submitted) {
    return (
      <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-16 md:py-24")}>
        <div className="container mx-auto max-w-lg space-y-6 px-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">{props.successHeading}</h2>
          <p className="leading-relaxed text-muted-foreground">{props.successBody}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={props.successCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              {props.successCtaLabel}
            </a>
            <a
              href={props.packagesAnchorHref}
              className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-primary bg-primary/5 px-8 text-base font-semibold text-primary hover:bg-primary/10"
            >
              Xem lại các combo
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-16 md:py-24")}>
      <div className="container mx-auto max-w-lg px-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{props.heading}</h2>
            <p className="text-sm text-muted-foreground">{props.subheading}</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            <div>
              <label className="text-foreground">Họ tên</label>
              <input
                required
                placeholder="Nguyễn Văn A"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-foreground">Bạn đang ở thành phố nào tại Đức?</label>
              <input
                required
                placeholder="Berlin, München…"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-foreground">Mục tiêu</label>
              <select
                required
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Chọn mục tiêu</option>
                <option value="giao-tiep">Giao tiếp hàng ngày</option>
                <option value="di-lam">Đi làm</option>
                <option value="thi-a1">Thi A1</option>
                <option value="thi-b1">Thi B1</option>
                <option value="khac">Khác</option>
              </select>
            </div>
            <div>
              <label className="text-foreground">Trình độ hiện tại</label>
              <select
                required
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Chọn trình độ</option>
                <option value="mat-goc">Mất gốc / Chưa học</option>
                <option value="a1">A1</option>
                <option value="a2">A2</option>
                <option value="b1">B1</option>
              </select>
            </div>
            <div>
              <label className="text-foreground">Số điện thoại (WhatsApp) hoặc Email</label>
              <input
                required
                placeholder="+49… hoặc email@..."
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5"
              />
              <span>{props.consentLabel}</span>
            </label>

            <button
              type="submit"
              disabled={!consent}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.submitLabel}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <a
              href={props.fallbackCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {props.fallbackCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
