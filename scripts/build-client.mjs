import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(ROOT, "client", "main.js")],
  outfile: path.join(ROOT, "public", "bundle.js"),
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: false,
  sourcemap: true,
  logLevel: "info",
});
