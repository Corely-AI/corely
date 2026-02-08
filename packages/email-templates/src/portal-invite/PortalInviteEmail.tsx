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
import type { PortalInviteEmailProps } from "./portal-invite-email.types";

export function PortalInviteEmail({
  portalUrl,
  studentName,
  appName = "Corely",
}: PortalInviteEmailProps) {
  const previewText = `You've been invited to the ${appName} Portal`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to the Portal</Heading>

          <Text style={text}>
            You've been invited to access the {appName} student & guardian portal
            {studentName ? ` for ${studentName}` : ""}.
          </Text>

          <Text style={text}>
            Use the portal to view class schedules, download learning materials, and stay up to date
            with progress.
          </Text>

          <Section style={buttonSection}>
            <Link href={portalUrl} style={button}>
              Open Portal
            </Link>
          </Section>

          <Text style={text}>
            When you open the portal, enter your email address and we'll send you a one-time login
            code — no password needed.
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
