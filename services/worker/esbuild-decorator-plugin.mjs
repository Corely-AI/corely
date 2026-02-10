import { transform } from "@swc/core";

export const decoratorPlugin = {
  name: "decorator-plugin",
  setup(build) {
    build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
      if (args.path.includes("node_modules")) {
        return null;
      }

      const ts = await import("fs").then((fs) => fs.promises.readFile(args.path, "utf8"));

      const result = await transform(ts, {
        filename: args.path,
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: args.path.endsWith(".tsx"),
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            decoratorMetadata: true,
            legacyDecorator: true,
          },
          target: "es2022",
          keepClassNames: true,
        },
        module: {
          type: "es6",
        },
        sourceMaps: true,
      });

      return {
        contents: result.code,
        loader: "js",
      };
    });
  },
};
