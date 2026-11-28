import type { CSSProperties } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import type { InvoiceEmailProps } from "./invoice-email.types";
import { formatInvoiceEmailTitle, getInvoiceEmailCopy } from "./invoice-email-copy";

export function InvoiceEmail({
  invoiceNumber,
  companyName,
  dueDate,
  totalAmount,
  customMessage,
  paymentDetails,
  viewInvoiceUrl,
  locale,
}: InvoiceEmailProps) {
  const { language, copy } = getInvoiceEmailCopy(locale);
  const invoice = { companyName, invoiceNumber };
  const previewText = formatInvoiceEmailTitle(copy.preview, invoice);
  const payToItems = [
    paymentDetails?.method ? `${copy.method}: ${paymentDetails.method}` : undefined,
    paymentDetails?.accountHolderName
      ? `${copy.account}: ${paymentDetails.accountHolderName}`
      : undefined,
    paymentDetails?.bankName ? `${copy.bank}: ${paymentDetails.bankName}` : undefined,
    paymentDetails?.iban ? `IBAN: ${paymentDetails.iban}` : undefined,
    paymentDetails?.bic ? `BIC: ${paymentDetails.bic}` : undefined,
    paymentDetails?.referenceText
      ? `${copy.reference}: ${paymentDetails.referenceText}`
      : undefined,
    paymentDetails?.instructions
      ? `${copy.instructions}: ${paymentDetails.instructions}`
      : undefined,
  ].filter((line): line is string => Boolean(line && line.trim().length > 0));

  return (
    <Html lang={language}>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandSection}>
            <Text style={brandText}>Corely.one</Text>
          </Section>

          <Section style={card}>
            <Text style={heroTitle}>{formatInvoiceEmailTitle(copy.heading, invoice)}</Text>

            {customMessage ? <Text style={customMessageText}>{customMessage}</Text> : null}

            <Text style={detailsTitle}>{copy.details}</Text>

            <Row style={detailsRow}>
              <Column style={detailsColumn}>
                <Text style={label}>{copy.dueDate}</Text>
                <Text style={value}>{dueDate}</Text>
              </Column>
              <Column style={detailsColumn}>
                <Text style={label}>{copy.total}</Text>
                <Text style={value}>{totalAmount}</Text>
              </Column>
            </Row>

            <Row style={detailsRow}>
              <Column style={detailsColumn}>
                <Text style={label}>{copy.payTo}</Text>
                {payToItems.length > 0 ? (
                  payToItems.map((line) => (
                    <Text key={line} style={value}>
                      {line}
                    </Text>
                  ))
                ) : (
                  <Text style={value}>{viewInvoiceUrl ? copy.openBelow : copy.seePdf}</Text>
                )}
              </Column>
              <Column style={detailsColumn}>
                <Text style={label}>{copy.invoice}</Text>
                <Text style={value}>{viewInvoiceUrl ? copy.portalPdf : copy.attached}</Text>
                {viewInvoiceUrl ? (
                  <Text style={value}>
                    {`${copy.portalLink}: `}
                    <Link href={viewInvoiceUrl} style={inlineLink}>
                      {viewInvoiceUrl}
                    </Link>
                  </Text>
                ) : null}
              </Column>
            </Row>

            {viewInvoiceUrl ? (
              <Section style={buttonSection}>
                <Link href={viewInvoiceUrl} style={button}>
                  {copy.viewInvoice}
                </Link>
              </Section>
            ) : null}
          </Section>

          <Text style={footerText}>{copy.sentVia}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: CSSProperties = {
  backgroundColor: "#efefef",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "16px 0 48px",
};

const container: CSSProperties = {
  maxWidth: "680px",
  margin: "0 auto",
};

const brandSection: CSSProperties = {
  textAlign: "center",
  padding: "18px 0 24px",
};

const brandText: CSSProperties = {
  margin: "0",
  fontSize: "34px",
  lineHeight: "38px",
  fontWeight: "700",
  color: "#0f2546",
  letterSpacing: "-0.4px",
};

const card: CSSProperties = {
  backgroundColor: "#dbe6e3",
  padding: "52px 56px 46px",
};

const heroTitle: CSSProperties = {
  margin: "0",
  fontSize: "56px",
  lineHeight: "60px",
  fontWeight: "700",
  color: "#143b66",
  letterSpacing: "-1px",
};

const customMessageText: CSSProperties = {
  margin: "22px 0 0",
  fontSize: "17px",
  lineHeight: "26px",
  color: "#1f354f",
};

const detailsTitle: CSSProperties = {
  margin: "46px 0 18px",
  fontSize: "52px",
  lineHeight: "56px",
  fontWeight: "700",
  color: "#143b66",
  letterSpacing: "-0.8px",
};

const detailsRow: CSSProperties = {
  marginTop: "22px",
};

const detailsColumn: CSSProperties = {
  width: "50%",
  paddingRight: "18px",
  verticalAlign: "top",
};

const label: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "34px",
  lineHeight: "38px",
  fontWeight: "700",
  color: "#143b66",
  letterSpacing: "-0.5px",
};

const value: CSSProperties = {
  margin: "0",
  fontSize: "26px",
  lineHeight: "34px",
  color: "#616f7c",
};

const inlineLink: CSSProperties = {
  color: "#143b66",
  textDecoration: "underline",
  wordBreak: "break-all",
};

const buttonSection: CSSProperties = {
  marginTop: "30px",
  textAlign: "center",
};

const button: CSSProperties = {
  backgroundColor: "#143b66",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "12px 28px",
};

const footerText: CSSProperties = {
  margin: "16px 0 0",
  textAlign: "center",
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
};
