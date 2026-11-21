import { readFile, writeFile, stat } from "node:fs/promises";
import { renderLayoutProof } from "../../src/modules/sign/infrastructure/pdf/render-layout-proof";

async function run() {
  const [source, layout, output] = process.argv.slice(2);
  if (!source || !layout || !output)
    throw Error("Usage: sign-layout-proof <trusted.pdf> <layout.json> <new-proof.pdf>");
  if ((await stat(source)).size > 10 * 1024 * 1024 || (await stat(layout)).size > 512000)
    throw Error("Input exceeds the proof limits");
  const result = await renderLayoutProof(
    await readFile(source),
    JSON.parse(await readFile(layout, "utf8"))
  );
  await writeFile(output, result, { flag: "wx" });
}
void run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Proof failed");
  process.exitCode = 1;
});
