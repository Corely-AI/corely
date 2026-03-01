export type TemplateFormState = {
  id?: string;
  channel: string;
  name: string;
  subject: string;
  body: string;
};

export const isEmailChannel = (channel: string) => channel === "email";

export const makeInitialFormState = (channel?: string): TemplateFormState => ({
  channel: channel && channel !== "all" ? channel : "email",
  name: "",
  subject: "",
  body: "",
});

export const TEMPLATE_VARIABLES: Array<{ key: string; description: string }> = [
  { key: "fullName", description: "Contact full name" },
  { key: "firstName", description: "Contact first name" },
  { key: "lastName", description: "Contact last name" },
  { key: "dealTitle", description: "Deal title" },
  { key: "amount", description: "Deal amount" },
  { key: "currency", description: "Deal currency" },
  { key: "email", description: "Primary email" },
  { key: "phoneE164", description: "Primary phone number" },
  { key: "profileUrl", description: "Best available profile URL" },
];

export const TEMPLATE_PREVIEW_CONTEXT: Record<string, string> = {
  fullName: "Alex Morgan",
  firstName: "Alex",
  lastName: "Morgan",
  dealTitle: "Q2 Expansion Plan",
  amount: "12500",
  currency: "EUR",
  email: "alex.morgan@example.com",
  phoneE164: "+4915123456789",
  profileUrl: "https://example.com/alex-morgan",
  subject: "Quick follow-up",
  message: "Wanted to share a quick update.",
};
