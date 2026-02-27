"use client";

import { HttpError } from "@corely/api-client";
import { useEffect, useRef } from "react";
import { sonnerToast } from "@/components/ui";

const extractDetail = (error: unknown): string => {
  if (error instanceof HttpError) {
    const body = error.body;
    if (typeof body === "object" && body) {
      const detail = (body as { detail?: string }).detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }
    }
    return `Request failed (${error.status ?? "unknown"})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};

export const useQueryErrorToast = (error: unknown, title: string) => {
  const lastErrorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }

    const detail = extractDetail(error);
    const key = `${title}:${detail}`;
    if (lastErrorKeyRef.current === key) {
      return;
    }

    lastErrorKeyRef.current = key;
    sonnerToast.error(title, { description: detail });
  }, [error, title]);
};
