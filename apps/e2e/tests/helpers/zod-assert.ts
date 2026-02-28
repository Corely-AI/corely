import { expect } from "@playwright/test";

type SafeParseIssue = {
  path: Array<string | number>;
  message: string;
};

type SafeParseSuccess<T> = {
  success: true;
  data: T;
};

type SafeParseFailure = {
  success: false;
  error: {
    issues: SafeParseIssue[];
  };
};

type ZodLikeSchema<T> = {
  parse: (value: unknown) => T;
  safeParse?: (value: unknown) => SafeParseSuccess<T> | SafeParseFailure;
};

export function expectZod<T>(schema: ZodLikeSchema<T>, value: unknown): T {
  if (schema.safeParse) {
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("\n");
    expect(false, `Zod validation failed:\n${issues}`).toBe(true);
    throw new Error("Unreachable");
  }

  try {
    return schema.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(false, `Zod validation failed: ${message}`).toBe(true);
    throw error;
  }
}
