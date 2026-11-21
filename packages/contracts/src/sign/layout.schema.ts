// Field and role provenance is recorded in docs/devops/sign-notices/NOTICE.md.
import { z } from "zod";

const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const fraction = z.number().finite().min(0).max(1);

export const SignFieldTypeSchema = z.enum(["signature", "initials", "text", "date", "checkbox"]);
export const SignRectangleSchema = z
  .object({
    x: fraction,
    y: fraction,
    width: fraction.positive(),
    height: fraction.positive(),
  })
  .strict()
  .refine((rect) => rect.x + rect.width <= 1 && rect.y + rect.height <= 1, {
    message: "The entire field must fit on the displayed page.",
  });
export type SignRectangle = z.infer<typeof SignRectangleSchema>;

export const SignFieldSchema = z
  .object({
    id: identifier,
    type: SignFieldTypeSchema,
    documentId: identifier,
    roleId: identifier,
    pageIndex: z.number().int().min(0).max(99),
    required: z.boolean(),
    rect: SignRectangleSchema,
  })
  .strict();

const roleSchema = z.object({ id: identifier, name: z.string().trim().min(1).max(80) }).strict();
const documentSchema = z
  .object({
    id: identifier,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().min(1).max(100),
  })
  .strict();

const templateV1 = z
  .object({
    schemaVersion: z.literal(1),
    document: documentSchema,
    roles: z.array(roleSchema).min(1).max(20),
    fields: z.array(SignFieldSchema).max(250),
  })
  .strict();

// Resolve references against this snapshot only. Indices in issue paths identify
// the offending row even when two rows have the same user-supplied identifier.
export const SignLayoutSchema = templateV1.superRefine(({ roles, fields, document }, ctx) => {
  const roleIds = new Set<string>();
  for (const [index, role] of roles.entries()) {
    if (roleIds.has(role.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["roles", index, "id"],
        message: "Role IDs must be unique.",
      });
    }
    roleIds.add(role.id);
  }
  const fieldIds = new Set<string>();
  fields.forEach((field, index) => {
    const check = (valid: boolean, property: keyof typeof field, message: string) => {
      if (!valid) ctx.addIssue({ code: "custom", path: ["fields", index, property], message });
    };
    check(!fieldIds.has(field.id), "id", "Field IDs must be unique.");
    check(roleIds.has(field.roleId), "roleId", "Assign the field to a role in this template.");
    check(
      field.documentId === document.id,
      "documentId",
      "The field must belong to the template document."
    );
    check(
      field.pageIndex < document.pageCount,
      "pageIndex",
      "Choose a page within the template document."
    );
    fieldIds.add(field.id);
  });
});
export type SignLayout = z.infer<typeof SignLayoutSchema>;
export type SignField = SignLayout["fields"][number];
