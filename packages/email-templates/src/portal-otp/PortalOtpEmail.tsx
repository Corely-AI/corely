import type { CSSProperties } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { PortalOtpEmailProps } from "./portal-otp-email.types";

export function PortalOtpEmail({ code, expiryMinutes, appName = "Corely" }: PortalOtpEmailProps) {
  const previewText = `Your ${appName} login code is ${code}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your login code</Heading>

          <Text style={text}>Enter the following code to sign in to your {appName} portal:</Text>

          <Section style={codeSection}>
            <Text style={codeStyle}>{code}</Text>
          </Section>

          <Text style={text}>
            This code expires in {expiryMinutes} minutes. If you did not request this code, you can
            safely ignore this email.
          </Text>

          <Text style={footer}>Thanks,</Text>
          <Text style={footer}>{appName}</Text>
        </Container>
      </Body>
    </Html>
  );
}

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
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0 16px",
  padding: "0 40px",
};

const text: CSSProperties = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const codeSection = {
  padding: "0 40px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const codeStyle: CSSProperties = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  color: "#111827",
  display: "inline-block",
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "6px",
  padding: "16px 32px",
};

const footer: CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
  padding: "0 40px",
};
