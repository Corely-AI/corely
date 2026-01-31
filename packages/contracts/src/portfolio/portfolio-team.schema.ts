import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  PortfolioContentStatusSchema,
  PortfolioTeamMemberSchema,
} from "./portfolio.types";

export const CreatePortfolioTeamMemberInputSchema = z.object({
  name: z.string().min(1),
  roleTitle: z.string().min(1),
  bio: z.string().min(1),
  skills: z.array(z.string()).optional(),
  photoUrl: z.string().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  status: PortfolioContentStatusSchema.optional(),
  sortOrder: z.number().int().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePortfolioTeamMemberInputSchema = z.object({
  name: z.string().min(1).optional(),
  roleTitle: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
  skills: z.array(z.string()).optional(),
  photoUrl: z.string().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  status: PortfolioContentStatusSchema.optional(),
  sortOrder: z.number().int().optional().nullable(),
});

export const ListPortfolioTeamMembersInputSchema = ListQuerySchema.extend({
  status: PortfolioContentStatusSchema.optional(),
});

export const ListPortfolioTeamMembersOutputSchema = z.object({
  items: z.array(PortfolioTeamMemberSchema),
  pageInfo: PageInfoSchema,
});

export const GetPortfolioTeamMemberOutputSchema = z.object({
  teamMember: PortfolioTeamMemberSchema,
});

export type CreatePortfolioTeamMemberInput = z.infer<typeof CreatePortfolioTeamMemberInputSchema>;
export type UpdatePortfolioTeamMemberInput = z.infer<typeof UpdatePortfolioTeamMemberInputSchema>;
export type ListPortfolioTeamMembersInput = z.infer<typeof ListPortfolioTeamMembersInputSchema>;
export type ListPortfolioTeamMembersOutput = z.infer<typeof ListPortfolioTeamMembersOutputSchema>;
export type GetPortfolioTeamMemberOutput = z.infer<typeof GetPortfolioTeamMemberOutputSchema>;
