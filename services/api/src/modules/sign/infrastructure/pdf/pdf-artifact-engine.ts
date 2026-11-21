import { zipSync } from "fflate";
import { readFile, stat } from "node:fs/promises";
import { renderInChild } from "./render-in-child";
import { Injectable } from "@nestjs/common";
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { SignPdf } from "@signpdf/signpdf";
import type { SignValues, SignLayout } from "@corely/contracts";
import {
  SignArtifactEngine,
  type SignEvidence,
  type SignVerification,
} from "../../application/ports/sign-artifact-engine";
import { inspectTemplatePdf } from "./inspect-template-pdf";
import { ServiceCertificateSigner, verifyServiceSeal } from "./pdf-certificate-signature";
import { hash } from "../../domain/digest";
@Injectable()
export class PdfArtifactEngine extends SignArtifactEngine {
  bundle(source: Buffer, signed: Buffer, evidence: Buffer, verification: SignVerification) {
    return Buffer.from(
      zipSync(
        {
          "original.pdf": source,
          "signed.pdf": signed,
          "evidence.json": evidence,
          "verification.json": Buffer.from(JSON.stringify(verification)),
        },
        { level: 0 }
      )
    );
  }
  async evidence(bytes: Buffer) {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const names = pdf.catalog
      .lookup(PDFName.of("Names"), PDFDict)
      .lookup(PDFName.of("EmbeddedFiles"), PDFDict)
      .lookup(PDFName.of("Names"), PDFArray);
    if (names.size() !== 2) {
      throw Error("Unexpected embedded evidence");
    }
    const stream = names
      .lookup(1, PDFDict)
      .lookup(PDFName.of("EF"), PDFDict)
      .lookup(PDFName.of("F"));
    if (!(stream instanceof PDFRawStream)) {
      throw Error("Invalid embedded evidence stream");
    }
    return Buffer.from(decodePDFRawStream(stream).decode());
  }
  verify(bytes: Buffer, at?: Date) {
    return verifyServiceSeal(bytes, at);
  }
  private async fontBytes() {
    const fontPath = process.env.SIGN_FONT_FILE;
    if (fontPath && (await stat(fontPath)).size > 32000000) {
      throw Error("Configured font too large");
    }
    return fontPath ? readFile(fontPath) : null;
  }
  async preview(source: Buffer, layout: SignLayout, roleId: string, values: SignValues) {
    if (
      hash(source) !== layout.document.sha256 ||
      (await inspectTemplatePdf(source)) !== layout.document.pageCount
    ) {
      throw Error("Source verification failed");
    }
    return renderInChild(
      source,
      layout,
      { sourceSha256: layout.document.sha256, acceptances: [{ roleId, values }] },
      await this.fontBytes(),
      true
    );
  }
  async generate(source: Buffer, layout: SignLayout, evidence: SignEvidence) {
    if (
      hash(source) !== evidence.sourceSha256 ||
      (await inspectTemplatePdf(source)) !== layout.document.pageCount
    ) {
      throw Error("Source verification failed");
    }
    const placeholder = await renderInChild(source, layout, evidence, await this.fontBytes());
    return new SignPdf().sign(placeholder, new ServiceCertificateSigner());
  }
}
