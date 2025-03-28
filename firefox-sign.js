import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read manifest.json to get the version
const manifest = JSON.parse(
  readFileSync(join(__dirname, "manifest.json"), "utf8")
);
const { version } = manifest;

const RELEASE_DIR = join(__dirname, "release");
const DIST_DIR = join(__dirname, "dist");
const FIREFOX_DIST = join(DIST_DIR, "firefox");

function checkWebExt() {
  try {
    execSync("npx web-ext --version", { stdio: "ignore" });
  } catch {
    console.error(
      "web-ext is not installed. Please install it with `npm install -g web-ext`"
    );
    process.exit(1);
  }
}

function buildFirefoxExtension() {
  console.log("Building Firefox extension...");
  try {
    execSync("npm run build:firefox", { stdio: "inherit" });
  } catch (error) {
    console.error("Error during Firefox extension build:", error.message);
    process.exit(1);
  }
}

// Create an XPI package for Firefox and sign it
function signFirefoxExtension() {
  console.log("Creating and signing Firefox extension...");

  checkWebExt();

  const apiKey = process.env.FIREFOX_API_KEY;
  const apiSecret = process.env.FIREFOX_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn(
      "Environment variables FIREFOX_API_KEY and FIREFOX_API_SECRET not defined."
    );
    console.warn("Firefox package will be created but not signed.");
  }

  try {
    // Using the version in the artifact name with --filename-pattern
    const webExtCmd = [
      "npx web-ext build",
      `--source-dir="${FIREFOX_DIST}"`,
      `--artifacts-dir="${RELEASE_DIR}"`,
      `--filename=quicktab-firefox-v${version}.xpi`,
      "--overwrite-dest",
    ].join(" ");

    execSync(webExtCmd, { stdio: "inherit" });

    // Sign the package if environment variables are defined
    if (apiKey && apiSecret) {
      console.log("Signing Firefox package...");
      const signCmd = [
        "npx web-ext sign",
        `--source-dir="${FIREFOX_DIST}"`,
        `--artifacts-dir="${RELEASE_DIR}"`,
        `--api-key="${apiKey}"`,
        `--api-secret="${apiSecret}"`,
        "--channel=unlisted",
      ].join(" ");

      execSync(signCmd, { stdio: "inherit" });
    }
  } catch (error) {
    console.error("Error signing Firefox extension:", error.message);
  }
}

// Main function
function main() {
  // Create release directory if it doesn't exist
  if (!existsSync(RELEASE_DIR)) {
    mkdirSync(RELEASE_DIR, { recursive: true });
  }

  // Build Firefox extension
  buildFirefoxExtension();

  // Sign Firefox extension
  signFirefoxExtension();

  console.log("Firefox extension signing process completed successfully!");
}

// Execute main function
try {
  main();
} catch (error) {
  console.error("Error during signing process:", error);
  process.exit(1);
}
