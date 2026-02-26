import React from "react";
import { sectionClass, type NailStudioStickyNavViewProps } from "./shared";

export const NailStudioStickyNavView = (props: NailStudioStickyNavViewProps) => (
  <nav
    id={props.anchorId}
    className={sectionClass(
      props,
      `${props.sticky === false ? "" : "sticky top-0"} z-40 border-b border-border/70 bg-background/90 backdrop-blur-lg`
    )}
  >
    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <a href={props.homeHref || "/"} className="flex items-center gap-3">
        {props.logoSrc ? (
          <img
            src={props.logoSrc}
            alt={props.siteTitle}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-xs font-semibold">
            NA
          </span>
        )}
        <span className="text-sm font-semibold tracking-[0.08em] uppercase">{props.siteTitle}</span>
      </a>

      <div className="hidden items-center gap-6 md:flex">
        {props.navItems.slice(0, 4).map((item) => (
          <a
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {item.label}
          </a>
        ))}
      </div>

      <a
        href={props.ctaHref}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
      >
        {props.ctaLabel}
      </a>
    </div>
  </nav>
);
