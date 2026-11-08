import { z } from "zod";

export const SsoAppKeySchema = z.enum(["app-center", "invoice", "hr"]);
export type SsoAppKey = z.infer<typeof SsoAppKeySchema>;
export const SsoHandleSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const SsoStartInputSchema = z
  .object({
    returnPath: z.string().max(2048).default("/"),
    csrfToken: SsoHandleSchema,
  })
  .strict();
export const SsoLoginInputSchema = z
  .object({
    requestId: SsoHandleSchema,
    csrfToken: SsoHandleSchema,
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
  })
  .strict();
export const SsoEmailCodeRequestSchema = SsoLoginInputSchema.omit({ password: true });
export const SsoEmailCodeVerifySchema = SsoEmailCodeRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/),
}).strict();
export const SsoEmailCodeEventSchema = z.object({ challengeId: SsoHandleSchema }).strict();
export const SsoContextSchema = z.object({
  appKey: SsoAppKeySchema,
  appOrigin: z.string().url(),
  accountOrigin: z.string().url().nullable(),
  csrfToken: SsoHandleSchema,
  expiresAt: z.string().datetime(),
});
export type SsoContext = z.infer<typeof SsoContextSchema>;
/** Host session metadata; no access/refresh token or opaque cookie handle is exposed. */
export const SsoSessionSchema = z
  .object({
    csrfToken: SsoHandleSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();
export type SsoSession = z.infer<typeof SsoSessionSchema>;
export const SsoRedirectSchema = z.object({ redirectTo: z.string().url() });

export function isSafeSsoReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  // Reject nested encodings as well as encoded slashes/control characters.
  if (hasForbiddenCharacters(path) || /%(?:25|2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(path);
    const pathname = new URL(decoded, "https://local.invalid").pathname;
    return (
      !/^\/(?:auth|sso)(?:\/|$)/i.test(pathname) &&
      !/^\/api\/(?:session|bff)(?:\/|$)/i.test(pathname) &&
      !hasForbiddenCharacters(decoded)
    );
  } catch {
    return false;
  }
}

function hasForbiddenCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (character === "\\" || code <= 32 || code === 127) {
      return true;
    }
  }
  return false;
}

/** Server-verified staff bootstrap. Memberships describe choices, not resource grants. */
export const SsoSessionUserSchema = SsoSessionSchema.extend({
  appKey: SsoAppKeySchema,
  user: z
    .object({
      userId: z.string().min(1),
      email: z.string().email(),
      name: z.string().nullable(),
      memberships: z.array(
        z
          .object({ tenantId: z.string().min(1), tenantName: z.string(), roleId: z.string() })
          .strict()
      ),
    })
    .strict(),
}).strict();
export type SsoSessionUser = z.infer<typeof SsoSessionUserSchema>;
