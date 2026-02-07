import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";

export const StudentGuardianSchema = z.object({
  guardian: CustomerDtoSchema,
  isPrimaryPayer: z.boolean(),
  isPrimaryContact: z.boolean(),
});

export const ListStudentGuardiansInputSchema = z.object({
  studentId: z.string(),
});

export const ListStudentGuardiansOutputSchema = z.object({
  studentId: z.string(),
  guardians: z.array(StudentGuardianSchema),
});

export const LinkGuardianInputSchema = z.object({
  guardianClientId: z.string(),
  isPrimaryPayer: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const LinkGuardianOutputSchema = ListStudentGuardiansOutputSchema;

export const SetPrimaryPayerInputSchema = z.object({
  guardianClientId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const SetPrimaryPayerOutputSchema = ListStudentGuardiansOutputSchema;

export const UnlinkGuardianOutputSchema = ListStudentGuardiansOutputSchema;

export type StudentGuardian = z.infer<typeof StudentGuardianSchema>;
export type ListStudentGuardiansInput = z.infer<typeof ListStudentGuardiansInputSchema>;
export type ListStudentGuardiansOutput = z.infer<typeof ListStudentGuardiansOutputSchema>;
export type LinkGuardianInput = z.infer<typeof LinkGuardianInputSchema>;
export type LinkGuardianOutput = z.infer<typeof LinkGuardianOutputSchema>;
export type SetPrimaryPayerInput = z.infer<typeof SetPrimaryPayerInputSchema>;
export type SetPrimaryPayerOutput = z.infer<typeof SetPrimaryPayerOutputSchema>;
export type UnlinkGuardianOutput = z.infer<typeof UnlinkGuardianOutputSchema>;
