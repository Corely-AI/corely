import React from "react";
import { sectionClass, type TutoringStickyNavViewProps } from "./shared";

export const TutoringStickyNavView = (props: TutoringStickyNavViewProps) => (
  <nav
    id={props.anchorId}
    className={sectionClass(
      props,
      "sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border"
    )}
  >
    <div className="container mx-auto flex h-14 items-center justify-between px-4">
      <a
        href={props.homeHref}
        className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity flex items-center gap-2"
      >
        {props.logoSrc ? (
          <img src={props.logoSrc} alt={props.siteTitle} className="h-8 w-auto object-contain" />
        ) : (
          <>
            {props.siteTitle} <span className="inline-block">🇩🇪❤️</span>
          </>
        )}
      </a>
      <div className="flex items-center gap-6">
        {props.navItems.map((item) => (
          <a
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="hidden text-sm font-medium transition-colors hover:text-primary sm:block"
          >
            {item.label}
          </a>
        ))}
        <a
          href={props.ctaHref}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          {props.ctaLabel}
        </a>
      </div>
    </div>
  </nav>
);
