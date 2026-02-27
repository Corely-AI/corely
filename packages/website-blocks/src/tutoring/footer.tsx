import React from "react";
import { sectionClass, type TutoringFooterViewProps } from "./shared";

export const TutoringFooterView = (props: TutoringFooterViewProps) => (
  <footer
    id={props.anchorId}
    className={sectionClass(props, "bg-foreground py-10 text-background")}
  >
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <div className="mb-2 flex items-center justify-center gap-2 md:justify-start">
            {props.logoSrc ? (
              <img
                src={props.logoSrc}
                alt={props.siteTitle}
                className="h-8 w-auto object-contain invert brightness-0"
              />
            ) : null}
            <span className="text-lg font-bold">{props.siteTitle}</span>
          </div>
          <p className="text-sm opacity-80">{props.subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          {props.socials.facebook ? (
            <a
              href={props.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              Facebook
            </a>
          ) : null}
          {props.socials.instagram ? (
            <a
              href={props.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              Instagram
            </a>
          ) : null}
          {props.socials.youtube ? (
            <a
              href={props.socials.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              YouTube
            </a>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-center text-xs opacity-50">{props.copyrightText}</p>
    </div>
  </footer>
);
