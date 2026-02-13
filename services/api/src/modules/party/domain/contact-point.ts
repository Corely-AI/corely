export type ContactPointType = "EMAIL" | "PHONE" | "SOCIAL";
export type SocialPlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "x"
  | "github"
  | "tiktok"
  | "youtube"
  | "other";

export type ContactPoint = {
  id: string;
  type: ContactPointType;
  value: string;
  platform?: SocialPlatform;
  label?: string | null;
  isPrimary: boolean;
};
