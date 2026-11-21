import { readFile, stat } from "node:fs/promises";
import { unzipSync } from "fflate";
import { z } from "zod";
import { PdfArtifactEngine } from "../../src/modules/sign/infrastructure/pdf/pdf-artifact-engine";
import { hash } from "../../src/modules/sign/domain/digest";

async function verify() {
  const archive = process.argv[2];
  if (!archive || (await stat(archive)).size > 64 * 1024 * 1024)
    throw Error("Pass an evidence ZIP of up to 64 MiB");
  const files = new Set(["signed.pdf", "original.pdf", "evidence.json", "verification.json"]);
  let expanded = 0;
  const parts = unzipSync(await readFile(archive), {
    filter: (entry) => {
      expanded += entry.originalSize;
      if (expanded > 64 * 1024 * 1024 || !files.delete(entry.name))
        throw Error("Unexpected archive contents");
      return true;
    },
  });
  if (files.size) throw Error("Missing evidence files");
  const pdf = Buffer.from(parts["signed.pdf"]),
    evidence = Buffer.from(parts["evidence.json"]),
    sourceSha256 = hash(Buffer.from(parts["original.pdf"]));
  const manifest = z
    .object({ artifactSha256: z.string(), sourceSha256: z.string(), evidenceSha256: z.string() })
    .parse(JSON.parse(Buffer.from(parts["verification.json"]).toString("utf8")));
  const engine = new PdfArtifactEngine();
  await engine.verify(pdf);
  if (
    hash(pdf) !== manifest.artifactSha256 ||
    hash(evidence) !== manifest.evidenceSha256 ||
    sourceSha256 !== manifest.sourceSha256 ||
    !evidence.equals(await engine.evidence(pdf))
  )
    throw Error("Bundle digests or sealed evidence differ");
  const signed = z
    .object({ requestId: z.string().uuid(), sourceSha256: z.string() })
    .parse(JSON.parse(evidence.toString("utf8")));
  if (signed.sourceSha256 !== sourceSha256)
    throw Error("Original document differs from signed evidence");
  console.log(
    JSON.stringify({
      verified: true,
      requestId: signed.requestId,
      artifactSha256: hash(pdf),
      sourceSha256,
    })
  );
}
void verify().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "Bundle verification failed");
  process.exitCode = 1;
});
