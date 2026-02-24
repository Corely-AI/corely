import React from "react";
import { sectionClass, type NailStudioFooterViewProps } from "./shared";

export const NailStudioFooterView = (props: NailStudioFooterViewProps) => (
  <footer
    id={props.anchorId ?? "footer"}
    className={sectionClass(props, "border-t border-border/70 bg-[#f7f2ed] py-10")}
  >
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]">{props.siteTitle}</p>
        {props.siteSubtitle ? (
          <p className="text-sm text-muted-foreground">{props.siteSubtitle}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{props.copyrightText}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          {props.links.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              className="underline-offset-4 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {props.socials?.instagram ? (
            <a
              href={props.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline"
            >
              Instagram
            </a>
          ) : null}
          {props.socials?.tiktok ? (
            <a
              href={props.socials.tiktok}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 hover:underline"
            >
              TikTok
            </a>
          ) : null}
          {props.socials?.email ? <span>{props.socials.email}</span> : null}
        </div>
      </div>
    </div>
  </footer>
);
