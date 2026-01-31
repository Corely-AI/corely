import { z } from "zod";
import type {
  CreatePortfolioTeamMemberInput,
  PortfolioTeamMember,
  UpdatePortfolioTeamMemberInput,
} from "@corely/contracts";
import { PortfolioContentStatusSchema } from "@corely/contracts";
import {
  emptyToNull,
  emptyToUndefined,
  formatJson,
  joinCommaList,
  parseCommaList,
  parseJsonRecord,
  parseOptionalNumber,
} from "../utils";

export const teamFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roleTitle: z.string().min(1, "Role title is required"),
  bio: z.string().min(1, "Bio is required"),
  skills: z.string().optional(),
  photoUrl: z.string().optional(),
  socialLinks: z.string().optional(),
  status: PortfolioContentStatusSchema,
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

export type TeamFormData = z.infer<typeof teamFormSchema>;

export const getDefaultTeamFormValues = (): TeamFormData => ({
  name: "",
  roleTitle: "",
  bio: "",
  skills: "",
  photoUrl: "",
  socialLinks: "",
  status: "draft",
  sortOrder: "",
});

export const toTeamFormValues = (member: PortfolioTeamMember): TeamFormData => ({
  name: member.name ?? "",
  roleTitle: member.roleTitle ?? "",
  bio: member.bio ?? "",
  skills: joinCommaList(member.skills),
  photoUrl: member.photoUrl ?? "",
  socialLinks: formatJson(member.socialLinks),
  status: member.status,
  sortOrder: member.sortOrder ?? "",
});

export const toCreateTeamInput = (data: TeamFormData): CreatePortfolioTeamMemberInput => ({
  name: data.name.trim(),
  roleTitle: data.roleTitle.trim(),
  bio: data.bio.trim(),
  skills: parseCommaList(data.skills),
  photoUrl: emptyToUndefined(data.photoUrl),
  socialLinks: data.socialLinks ? parseJsonRecord(data.socialLinks) ?? {} : undefined,
  status: data.status,
  sortOrder: parseOptionalNumber(data.sortOrder),
});

export const toUpdateTeamInput = (data: TeamFormData): UpdatePortfolioTeamMemberInput => ({
  name: data.name.trim(),
  roleTitle: data.roleTitle.trim(),
  bio: data.bio.trim(),
  skills: parseCommaList(data.skills),
  photoUrl: emptyToNull(data.photoUrl),
  socialLinks: data.socialLinks ? parseJsonRecord(data.socialLinks) ?? {} : null,
  status: data.status,
  sortOrder: parseOptionalNumber(data.sortOrder),
});

export const validateTeamPayload = (data: TeamFormData): string | null => {
  if (data.socialLinks && !parseJsonRecord(data.socialLinks)) {
    return "Social links must be valid JSON object.";
  }
  return null;
};
