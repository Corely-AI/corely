import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, copyFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Run against the exact clean checkout used to build the distributed artifact.
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
async function run() {
  const [destination] = process.argv.slice(2);
  if (!destination) throw Error("Pass the release staging directory for downloadable source.");
  if (git("status", "--porcelain", "--untracked-files=normal"))
    throw Error("Source packaging requires a clean committed build input.");
  if (
    git("ls-files", "--stage")
      .split("\n")
      .some((line) => line.startsWith("160000 "))
  )
    throw Error("Review submodule source before packaging.");
  const commit = git("rev-parse", "HEAD");
  git("cat-file", "-e", "HEAD:LICENSE");
  const temp = await mkdtemp(join(tmpdir(), "corely-sign-source-"));
  try {
    const filename = "corely-sign-" + commit + ".zip";
    const archive = join(temp, filename);
    git(
      "archive",
      "--format=zip",
      "--prefix=corely-" + commit + "/",
      "--output=" + archive,
      commit
    );
    const hash = createHash("sha256");
    for await (const part of createReadStream(archive)) hash.update(part);
    await mkdir(destination, { recursive: true });
    await copyFile(archive, join(resolve(destination), filename), constants.COPYFILE_EXCL);
    console.log(JSON.stringify({ commit, filename, sha256: hash.digest("hex") }));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
