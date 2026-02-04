import type { CSSProperties } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { PasswordResetEmailProps } from "./password-reset-email.types";

export function PasswordResetEmail({ resetUrl, appName = "Corely" }: PasswordResetEmailProps) {
  const previewText = `Reset your ${appName} password`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset your password</Heading>

          <Text style={text}>
            We received a request to reset your {appName} password. Click the button below to choose
            a new one.
          </Text>

          <Section style={buttonSection}>
            <Link href={resetUrl} style={button}>
              Reset password
            </Link>
          </Section>

          <Text style={text}>
            If you didn&apos;t request this, you can safely ignore this email.
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

const buttonSection = {
  padding: "0 40px",
  margin: "24px 0",
};

const button: CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
};

const footer: CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
  padding: "0 40px",
};
