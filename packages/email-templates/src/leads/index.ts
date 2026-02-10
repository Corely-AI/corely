export { LeadConfirmationEmail } from "./LeadConfirmationEmail";
export const buildLeadConfirmationEmailSubject = (tenantName: string) =>
  `Inquiry Received - ${tenantName}`;
