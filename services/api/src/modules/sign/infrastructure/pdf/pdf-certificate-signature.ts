import { X509Certificate } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Signer } from "@signpdf/utils";
const exec = promisify(execFile);
function configured(name: string) {
  const value = process.env[name];
  if (!value) {
    throw Error("Configure " + name + " for artifact sealing");
  }
  return value;
}
async function temporary<T>(fn: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), "corely-seal-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function cms(args: string[]) {
  try {
    await exec(process.env.SIGN_OPENSSL_BIN ?? "openssl", ["cms", ...args], {
      timeout: 15000,
      maxBuffer: 128000,
      windowsHide: true,
    });
  } catch {
    throw Error(
      "CMS operation failed. Check certificate trust, validity, key access and OpenSSL configuration."
    );
  }
}
export class ServiceCertificateSigner extends Signer {
  override sign(bytes: Buffer) {
    return temporary(async (dir) => {
      await writeFile(join(dir, "content"), bytes, { mode: 0o600 });
      await cms([
        "-sign",
        "-binary",
        "-nosmimecap",
        "-md",
        "sha256",
        "-in",
        join(dir, "content"),
        "-signer",
        configured("SIGN_CERT_FILE"),
        "-inkey",
        configured("SIGN_KEY_FILE"),
        "-outform",
        "DER",
        "-out",
        join(dir, "signature"),
      ]);
      return readFile(join(dir, "signature"));
    });
  }
}
export async function verifyServiceSeal(pdf: Buffer, at?: Date) {
  const text = pdf.toString("latin1");
  const ranges = [...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  if (ranges.length !== 1) {
    throw Error("Expected one PDF signature");
  }
  const [start, left, right, tail] = ranges[0].slice(1).map(Number);
  if (
    start !== 0 ||
    left <= 0 ||
    right <= left ||
    right + tail !== pdf.length ||
    !text.slice(0, left).endsWith("/Contents ") ||
    !/^<[a-fA-F0-9]+>$/.test(text.slice(left, right))
  ) {
    throw Error("Incomplete signature byte coverage");
  }
  const hex = text.slice(left + 1, right - 1);
  if (hex.length % 2) {
    throw Error("Invalid signature encoding");
  }
  await temporary(async (dir) => {
    await writeFile(join(dir, "sig"), Buffer.from(hex, "hex"), { mode: 0o600 });
    await writeFile(
      join(dir, "content"),
      Buffer.concat([pdf.subarray(0, left), pdf.subarray(right)]),
      { mode: 0o600 }
    );
    await cms([
      "-verify",
      "-binary",
      "-inform",
      "DER",
      "-in",
      join(dir, "sig"),
      "-content",
      join(dir, "content"),
      "-CAfile",
      configured("SIGN_TRUST_FILE"),
      "-no-CApath",
      "-purpose",
      "any",
      ...(at ? ["-attime", String(Math.floor(+at / 1000))] : []),
      "-signer",
      join(dir, "verified.pem"),
      "-out",
      join(dir, "checked"),
    ]);
    await cms([
      "-cmsout",
      "-inform",
      "DER",
      "-in",
      join(dir, "sig"),
      "-outform",
      "DER",
      "-out",
      join(dir, "canonical"),
    ]);
    const canonical = await readFile(join(dir, "canonical"));
    if (hex.toLowerCase() !== canonical.toString("hex").padEnd(hex.length, "0")) {
      throw Error("Invalid PDF signature padding");
    }
    const verified = await readFile(join(dir, "verified.pem"), "utf8");
    const allowed = configured("SIGN_TRUSTED_FINGERPRINTS")
      .split(",")
      .map((f) => f.trim().toUpperCase());
    if (
      verified.split("-----BEGIN CERTIFICATE-----").length !== 2 ||
      !allowed.includes(new X509Certificate(verified).fingerprint256)
    ) {
      throw Error("Unexpected service certificate");
    }
  });
}
