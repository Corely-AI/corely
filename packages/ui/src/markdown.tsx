import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "./lib/utils";

type MarkdownProps = {
  content: string;
  className?: string;
};

export const Markdown: React.FC<MarkdownProps> = ({ content, className }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    className={cn("text-sm leading-relaxed", className)}
    components={{
      strong: ({ children, ...props }) => (
        <strong className="font-semibold text-foreground" {...props}>
          {children}
        </strong>
      ),
      em: ({ children, ...props }) => (
        <em className="italic text-foreground" {...props}>
          {children}
        </em>
      ),
      h1: ({ children, ...props }) => (
        <h1 className="text-lg font-semibold" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-base font-semibold" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-sm font-semibold" {...props}>
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p className="whitespace-pre-wrap" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul className="list-disc space-y-1 pl-5" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="list-decimal space-y-1 pl-5" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="whitespace-pre-wrap" {...props}>
          {children}
        </li>
      ),
      a: ({ children, ...props }) => (
        <a className="text-primary underline" target="_blank" rel="noreferrer" {...props}>
          {children}
        </a>
      ),
      code: ({ children, ...props }) => (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground" {...props}>
          {children}
        </code>
      ),
      pre: ({ children, ...props }) => (
        <pre
          className="overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-foreground"
          {...props}
        >
          {children}
        </pre>
      ),
      table: ({ children, ...props }) => (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs" {...props}>
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead className="bg-muted/60" {...props}>
          {children}
        </thead>
      ),
      th: ({ children, ...props }) => (
        <th className="border border-border px-2 py-1 text-left font-semibold" {...props}>
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td className="border border-border px-2 py-1 align-top" {...props}>
          {children}
        </td>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);
