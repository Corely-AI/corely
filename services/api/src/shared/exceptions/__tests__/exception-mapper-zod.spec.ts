import { describe, expect, it } from "vitest";
import { HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { ExceptionToProblemDetailsMapper } from "../exception-to-problem-details.mapper";

describe("ExceptionToProblemDetailsMapper - Zod Errors", () => {
  it("maps ZodError to 400 ValidationFailed with field members", () => {
    const schema = z.object({
      socialLinks: z.array(
        z.object({
          platform: z.enum(["linkedin", "github"]),
          url: z.string().url(),
        })
      ),
    });

    const parsed = schema.safeParse({
      socialLinks: [{ platform: "myspace", url: "not-a-url" }],
    });
    if (parsed.success) {
      throw new Error("Expected schema parse to fail");
    }

    const mapper = new ExceptionToProblemDetailsMapper("trace-1", "/customers", false);
    const result = mapper.map(parsed.error);

    expect(result.type).toBe("https://errors.corely.one/Common:ValidationFailed");
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
    expect(result.code).toBe("Common:ValidationFailed");
    expect(result.validationErrors?.length).toBeGreaterThanOrEqual(1);
  });
});
