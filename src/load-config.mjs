import path from "node:path";
import { bundleRequire } from "bundle-require";

export async function loadConfig(filePath) {
  const { mod } = await bundleRequire({
    filepath: path.resolve(filePath),
    format: "esm"
  });
  return mod.default || mod;
}