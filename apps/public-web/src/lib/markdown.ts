import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const turndown = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
  emDelimiter: "*",
  bulletListMarker: "-",
});

turndown.use(gfm);

export const htmlToMarkdown = (html: string): string => {
  if (!html) {
    return "";
  }
  return turndown.turndown(html);
};
