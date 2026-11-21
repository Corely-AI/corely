import { X509Certificate } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { SignConfiguration } from "../application/ports/sign-configuration";
import { publicOrigin, sealInvitation } from "./invitation-vault";
async function readable(path?: string) {
  if (!path) {
    return false;
  }
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
export class RuntimeSignConfiguration extends SignConfiguration {
  async describe() {
    let origin: string | null = null,
      invitationKeyConfigured = false,
      certificateExpiresAt: string | null = null,
      signerPinned = false;
    try {
      origin = publicOrigin();
    } catch {
      /* Absent origin remains visible as unconfigured. */
    }
    try {
      sealInvitation("configuration probe", "configuration");
      invitationKeyConfigured = true;
    } catch {
      /* No secret is returned. */
    }
    if (process.env.SIGN_CERT_FILE) {
      try {
        const cert = new X509Certificate(await readFile(process.env.SIGN_CERT_FILE));
        certificateExpiresAt = new Date(cert.validTo).toISOString();
        signerPinned = (process.env.SIGN_TRUSTED_FINGERPRINTS ?? "")
          .toUpperCase()
          .split(",")
          .map((v) => v.trim())
          .includes(cert.fingerprint256);
      } catch {
        /* Invalid certificate is unavailable. */
      }
    }
    return {
      publicOrigin: origin,
      invitationKeyConfigured,
      certificateExpiresAt,
      signerPinned,
      privateKeyReadable: await readable(process.env.SIGN_KEY_FILE),
      trustFileReadable: await readable(process.env.SIGN_TRUST_FILE),
    };
  }
}
