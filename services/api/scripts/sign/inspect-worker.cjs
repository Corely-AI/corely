const { parentPort, workerData } = require("node:worker_threads");
const { readFileSync } = require("node:fs");
const { getQuickJS, shouldInterruptAfterDeadline } = require("quickjs-emscripten");

// This function runs inside QuickJS/WASM. It has no filesystem, network or host functions.
async function inspectStaticPdf() {
  const { PDFDocument, PDFDict, PDFArray, PDFName, PDFStream, PDFInvalidObject } =
    globalThis.PDFLib;
  const pdf = await PDFDocument.load(globalThis.source, {
    parseSpeed: Infinity,
    throwOnInvalidObject: true,
    updateMetadata: false,
  });
  const forbidden = new Set([
    "AcroForm",
    "Annots",
    "OpenAction",
    "AA",
    "A",
    "JavaScript",
    "JS",
    "Launch",
    "RichMedia",
    "EmbeddedFiles",
    "EmbeddedFile",
    "Filespec",
    "FileAttachment",
    "XFA",
    "ByteRange",
    "Sig",
    "DocTimeStamp",
    "Perms",
    "Collection",
    "Encrypt",
    "GoToR",
    "URI",
    "3D",
    "Movie",
    "Sound",
    "SubmitForm",
    "ImportData",
    "UserUnit",
    "JBIG2Decode",
    "JPXDecode",
  ]);
  const objects = pdf.context.enumerateIndirectObjects();
  if (objects.length > 30000) throw Error("complex");
  let count = 0;
  const visit = (object, depth) => {
    if (++count > 300000 || depth > 64 || object instanceof PDFInvalidObject)
      throw Error("unsupported");
    if (object instanceof PDFName && forbidden.has(object.decodeText())) throw Error("interactive");
    if (object instanceof PDFStream) visit(object.dict, depth + 1);
    else if (object instanceof PDFDict)
      for (const [key, value] of object.entries()) {
        if (key.decodeText() === "Annots" && value instanceof PDFArray && value.size() === 0)
          continue;
        visit(key, depth + 1);
        visit(value, depth + 1);
      }
    else if (object instanceof PDFArray)
      for (const item of object.asArray()) visit(item, depth + 1);
  };
  for (const [, object] of objects) visit(object, 0);
  const pages = pdf.getPages();
  if (!pages.length || pages.length > 100) throw Error("pages");
  for (const page of pages) {
    const crop = page.getCropBox(),
      media = page.getMediaBox();
    if (
      ![crop.x, crop.y, crop.width, crop.height, media.x, media.y, media.width, media.height].every(
        Number.isFinite
      ) ||
      crop.width <= 0 ||
      crop.height <= 0 ||
      media.width > 14400 ||
      media.height > 14400 ||
      crop.x < media.x ||
      crop.y < media.y ||
      crop.x + crop.width > media.x + media.width ||
      crop.y + crop.height > media.y + media.height ||
      ![0, 90, 180, 270].includes(((page.getRotation().angle % 360) + 360) % 360)
    )
      throw Error("geometry");
  }
  return pages.length;
}

async function run() {
  const engine = await getQuickJS();
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(96 * 1024 * 1024);
  runtime.setMaxStackSize(512 * 1024);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 4000));
  const vm = runtime.newContext();
  try {
    const program = readFileSync(require.resolve("pdf-lib/dist/pdf-lib.min.js"), "utf8");
    vm.unwrapResult(vm.evalCode(program, "pdf-lib.js", { type: "global" })).dispose();
    vm.newString(Buffer.from(workerData).toString("base64")).consume((value) =>
      vm.setProp(vm.global, "source", value)
    );
    const promise = vm.unwrapResult(vm.evalCode("(" + inspectStaticPdf.toString() + ")()"));
    try {
      vm.unwrapResult(runtime.executePendingJobs());
      const settled = vm.getPromiseState(promise);
      if (settled.type === "rejected") {
        settled.error.dispose();
        throw Error("unsupported");
      }
      if (settled.type !== "fulfilled") throw Error("incomplete");
      const count = settled.value.consume((value) => vm.getNumber(value));
      parentPort.postMessage(count);
    } finally {
      promise.dispose();
    }
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
run().catch(() => parentPort.postMessage(null));
