declare module "turndown" {
  export type TurndownOptions = {
    codeBlockStyle?: "fenced" | "indented";
    headingStyle?: "setext" | "atx";
    emDelimiter?: "_" | "*";
    bulletListMarker?: "-" | "*" | "+";
  } & Record<string, unknown>;

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    use(plugin: unknown): void;
    turndown(html: string): string;
  }
}

declare module "turndown-plugin-gfm" {
  export const gfm: unknown;
}
