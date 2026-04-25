import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

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

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  throw new Error(
    "Missing CIRCLE_API_KEY. Put it in flexi-flow-validation/.env (gitignored) or export it before running.",
  );
}

const entitySecret =
  process.env.CIRCLE_ENTITY_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.CIRCLE_ENTITY_SECRET) {
  // eslint-disable-next-line no-console
  console.log("Generated CIRCLE_ENTITY_SECRET (save this locally in .env; do not share):");
  // eslint-disable-next-line no-console
  console.log(entitySecret);
}

const walletSetName = arg("--wallet-set-name") || "validly";
const count = Math.max(1, Number(arg("--count") || "2"));
const existingWalletSetId = arg("--wallet-set-id");

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

let walletSetId = existingWalletSetId;
if (!walletSetId) {
  // eslint-disable-next-line no-console
  console.log("Creating wallet set…");
  let walletSet;
  try {
    walletSet = (await client.createWalletSet({ name: walletSetName })).data?.walletSet;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("entity secret has not been set yet")) {
      throw new Error(
        [
          "Circle rejected the request because the Entity Secret Ciphertext is not registered yet.",
          "",
          "Do this once (Testnet):",
          "- Run: npm run circle:register-entity-secret",
          "  (this registers the ciphertext + downloads the recovery file to output/)",
          "",
          "Or do it in Circle Console:",
          "- Wallets -> Dev Controlled -> Configurator -> Register Entity Secret Ciphertext",
          "",
          "Helper script to generate ciphertext:",
          "- Put your Entity Public Key PEM into a file, e.g. entity-public-key.pem",
          "- Run: npm run circle:encrypt-entity-secret -- --pem entity-public-key.pem",
          "- Paste the printed base64 ciphertext into the Console registration form",
        ].join("\n"),
      );
    }
    throw e;
  }
  walletSetId = walletSet?.id;
  if (!walletSetId) throw new Error("Wallet set creation failed: no id returned");
  // eslint-disable-next-line no-console
  console.log("walletSetId:", walletSetId);
} else {
  // eslint-disable-next-line no-console
  console.log("Using existing walletSetId:", walletSetId);
}

// eslint-disable-next-line no-console
console.log(`Creating ${count} wallet(s) on ARC-TESTNET…`);
const wallets = (await client.createWallets({
  walletSetId,
  blockchains: ["ARC-TESTNET"],
  count,
  accountType: "EOA",
})).data?.wallets;

if (!wallets || wallets.length === 0) {
  throw new Error("Wallet creation failed: no wallets returned");
}

for (const w of wallets) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ id: w.id, address: w.address, blockchain: w.blockchain }, null, 2));
}

// eslint-disable-next-line no-console
console.log("\nUse one wallet as PAYER_ADDRESS and one as PAY_TO_ADDRESS.");
