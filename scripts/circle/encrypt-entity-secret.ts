import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

loadDotEnv();

const pemPath = arg("--pem") || arg("-p");
if (!pemPath) {
  throw new Error("Missing --pem <path-to-entity-public-key.pem>");
}

const entitySecretHex = process.env.CIRCLE_ENTITY_SECRET;
if (!entitySecretHex) {
  throw new Error("Missing CIRCLE_ENTITY_SECRET (32-byte hex) in your .env");
}

const secret = Buffer.from(entitySecretHex, "hex");
if (secret.length !== 32) {
  throw new Error("CIRCLE_ENTITY_SECRET must be 32 bytes (64 hex chars)");
}

const pem = fs.readFileSync(path.resolve(process.cwd(), pemPath), "utf8");

const ciphertext = crypto.publicEncrypt(
  {
    key: pem,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  secret,
);

// eslint-disable-next-line no-console
console.log(ciphertext.toString("base64"));
