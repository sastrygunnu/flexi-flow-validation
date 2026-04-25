import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  generateEntitySecret,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

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
    const value = normalizeEnvValue(trimmed.slice(idx + 1));
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  throw new Error("Missing CIRCLE_API_KEY in .env");
}

let entitySecret = process.env.CIRCLE_ENTITY_SECRET;
if (!entitySecret) {
  entitySecret = generateEntitySecret();
  // eslint-disable-next-line no-console
  console.log("Generated CIRCLE_ENTITY_SECRET (save this locally in .env; do not share):");
  // eslint-disable-next-line no-console
  console.log(entitySecret);
}

// eslint-disable-next-line no-console
console.log("Registering entity secret ciphertext with Circle…");
await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: "output",
});

// eslint-disable-next-line no-console
console.log("Registered. Recovery file saved under output/ (keep it secure; do not commit).");

