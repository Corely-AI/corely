import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LeadConfirmationEmailProps {
  parentName?: string;
  studentName?: string;
  tenantName: string;
}

export const LeadConfirmationEmail = ({
  parentName,
  studentName,
  tenantName,
}: LeadConfirmationEmailProps) => {
  const previewText = `We received your inquiry, ${parentName || "there"}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thank you for your interest!</Heading>
          <Text style={text}>Hi {parentName || "there"},</Text>
          <Text style={text}>
            We've received your inquiry for tutoring{studentName ? ` for ${studentName}` : ""} at{" "}
            <strong>{tenantName}</strong>.
          </Text>
          <Section style={section}>
            <Text style={text}>
              Our team will review your submission and get back to you shortly to discuss how we can
              help.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>This is an automated confirmation from {tenantName}.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default LeadConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "left" as const,
  padding: "0 40px",
};

const section = {
  padding: "24px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
};
