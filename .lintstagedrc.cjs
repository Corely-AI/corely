const path = require("node:path");
const withoutE2E = (files) =>
  files.filter(
    (file) =>
      !path.relative(__dirname, path.resolve(file)).replace(/\\/g, "/").startsWith("apps/e2e/")
  );

const runIfAny = (files, command) => {
  if (files.length === 0) {
    return [];
  }
  return [`${command} ${files.join(" ")}`];
};

module.exports = {
  "**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}": (files) =>
    runIfAny(withoutE2E(files), "prettier --write"),
  "**/*.{ts,tsx,js,jsx}": (files) => runIfAny(withoutE2E(files), "eslint --fix --no-warn-ignored"),
};
