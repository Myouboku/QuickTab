import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  existsSync,
  copyFileSync,
} from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const browser = process.argv[2];
if (!browser || !["firefox", "chrome"].includes(browser)) {
  console.error("Please specify browser: firefox or chrome");
  process.exit(1);
}

const distDir = join(__dirname, "dist", browser);
const manifestPath = join(__dirname, "manifest.json");

// Clean dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Filter function to exclude certain directories and files
function shouldCopy(src) {
  return (
    !src.includes("node_modules") &&
    !src.includes("dist") &&
    !src.includes("manifest.json") &&
    !src.includes(".git")
  );
}

// Copy all files except manifest.json
function copyDir(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (!shouldCopy(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Copy files
copyDir(__dirname, distDir);

// Read and modify manifest
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// Remove browser_specific_settings for Chrome
if (browser === "chrome") {
  delete manifest.browser_specific_settings;
}

// Write modified manifest
writeFileSync(
  join(distDir, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`Build completed for ${browser}`);
