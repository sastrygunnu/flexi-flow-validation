import http from "node:http";
import { URL } from "node:url";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./store.mjs";
import { getProvider, getStep } from "./step-library.mjs";
// Mock functions removed - now using only real Circle payment data
import { getArcTestnetKind, getX402Transfer, settleX402Payment, getGatewayBalance } from "./payments/circle-gateway.mjs";
import {
  createUsdcTransferTransaction,
  getCircleTransaction,
  getPayerTokenBalances,
  getPayerWallet,
  makeEip3009Authorization,
  makeEip712TypedData,
  signTypedData,
} from "./payments/circle-wallets.mjs";

const PORT = Number(process.env.PORT || 8787);

let loadedDotEnvPath = null;

function candidateDotEnvPaths() {
  const fromCwd = path.resolve(process.cwd(), ".env");
  const fromProjectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".env",
  );
  return Array.from(new Set([fromCwd, fromProjectRoot]));
}

function loadDotEnv() {
  const envPath = candidateDotEnvPaths().find((p) => fs.existsSync(p));
  if (!envPath) return;
  loadedDotEnvPath = envPath;
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
    // Override missing/blank env vars, but don't clobber a non-empty exported env var.
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
  }
}

loadDotEnv();

function arcRpcUrl() {
  return process.env.ARC_RPC_URL || "";
}

function arcExplorerBaseUrl() {
  const raw = process.env.ARC_EXPLORER_BASE_URL;
  return raw.replace(/\/+$/, "");
}

async function arcRpc(method, params) {
  const url = arcRpcUrl();
  if (!url) {
    throw new Error("Missing ARC_RPC_URL (set it in .env to enable onchain balance checks)");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(`Arc RPC error: ${res.status}`);
  if (json.error) throw new Error(`Arc RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

function encodeBalanceOf(address) {
  const clean = address.toLowerCase().replace(/^0x/, "");
  if (clean.length !== 40) throw new Error("Invalid address");
  return `0x70a08231${clean.padStart(64, "0")}`;
}

function parseHexBigInt(hex) {
  if (typeof hex !== "string" || !hex.startsWith("0x")) throw new Error("Invalid hex");
  return BigInt(hex);
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  json(res, 404, { error: { message: "Not found" } });
}

function badRequest(res, message) {
  json(res, 400, { error: { message } });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

async function loadDb() {
  const flows = await readJson("flows.json", []);
  const runs = await readJson("runs.json", []);
  const logs = await readJson("logs.json", []);
  if (flows.length === 0) {
    const now = new Date().toISOString();
    flows.unshift({
      id: id("flow"),
      name: "us_onboarding",
      steps: [
        { type: "phone", provider: "twilio" },
        { type: "identity", provider: "persona" },
        { type: "address", provider: "google" },
        { type: "fraud", provider: "sift" },
      ],
      createdAt: now,
      updatedAt: now,
    });
    await saveDb({ flows, runs, logs });
  }
  return { flows, runs, logs };
}

async function saveDb(db, opts) {
  const options = {
    flows: true,
    runs: true,
    logs: true,
    ...(opts || {}),
  };
  const writes = [];
  if (options.flows) writes.push(writeJson("flows.json", db.flows));
  if (options.runs) writes.push(writeJson("runs.json", db.runs));
  if (options.logs) writes.push(writeJson("logs.json", db.logs));
  await Promise.all(writes);
}

function normalizeFlowName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "_")
    .slice(0, 80);
}

function computePaymentStatus(stepStatus, costUsd) {
  if (stepStatus === "success") return "paid";
  if (stepStatus === "timeout") return "pending";
  if (costUsd === 0) return "skipped";
  return "failed";
}

function computeRunStatusFromSteps(steps) {
  if (steps.some((s) => s.status === "timeout")) return "timeout";
  if (steps.some((s) => s.status === "failed")) return "failed";
  return "success";
}

function hydrateRunFromLogs(run, logs) {
  const steps = logs
    .filter((l) => l.runId === run.runId)
    .sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
  if (steps.length === 0) return run;
  const totalDurationMs = steps.reduce((s, l) => s + (Number(l.durationMs) || 0), 0);
  const totalCostUsd = steps.reduce((s, l) => s + (Number(l.costUsd) || 0), 0);
  const totalCostUsdc = steps.reduce((s, l) => s + (Number(l.costUsdc) || 0), 0);
  const avgArcSettlementNs = Math.round(
    steps.reduce((s, l) => s + (Number(l.arcSettlementNs) || 0), 0) / steps.length,
  );
  const endedAt = steps[steps.length - 1]?.timestamp || run.endedAt;
  const status = run.status === "running" ? "running" : computeRunStatusFromSteps(steps);
  return {
    ...run,
    steps,
    endedAt,
    totalDurationMs,
    totalCostUsd,
    totalCostUsdc,
    avgArcSettlementNs,
    nanopaymentCount: steps.length,
    status,
  };
}

function centsPerPaidCall() {
  const raw = process.env.BILL_USDC_CENTS;
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("BILL_USDC_CENTS must be a positive number (e.g. 1 for $0.01)");
  }
  return n;
}

function usdcFromCents(cents) {
  return cents / 100;
}

function normalizeEvmTxHash(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const hex = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return `0x${hex.toLowerCase()}`;
}

function findEvmTxHashByKey(value, depth = 0) {
  if (depth > 6) return null;
  if (!value) return null;
  if (typeof value === "string") return normalizeEvmTxHash(value);
  if (typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEvmTxHashByKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  // Only accept hashes from explicitly-named fields to avoid accidentally
  // picking up bytes32 values like nonces.
  const preferredKeys = [
    "blockchainTxHash",
    "blockchain_tx_hash",
    "txHash",
    "transactionHash",
    "transaction_hash",
    "hash",
  ];
  for (const k of preferredKeys) {
    if (k in value) {
      const normalized = normalizeEvmTxHash(value[k]);
      if (normalized) return normalized;
    }
  }

  // Fallback: accept other `*hash*` keys but avoid nonces/etc.
  for (const k of Object.keys(value)) {
    if (!/hash/i.test(k)) continue;
    if (/nonce/i.test(k)) continue;
    const normalized = normalizeEvmTxHash(value[k]);
    if (normalized) return normalized;
  }

  // Common nested containers
  const nestedKeys = ["transaction", "transfer", "receipt", "result", "data"];
  for (const k of nestedKeys) {
    if (k in value) {
      const found = findEvmTxHashByKey(value[k], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function looksLikeUuid(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function hydrateLogArcTxHashFromGateway(log) {
  if (!log || typeof log !== "object") return { updated: false };

  const gatewayTransferId = log?.payment?.gatewayTransferId;
  if (!gatewayTransferId) {
    if (looksLikeUuid(log.arcTxHash) && !log?.payment?.gatewayTransferId) {
      log.payment = log.payment || {};
      log.payment.gatewayTransferId = log.arcTxHash;
      log.arcTxHash = null;
      if (log.payment.arcTxHash === log.payment.gatewayTransferId) log.payment.arcTxHash = null;
      return { updated: true };
    }
    return { updated: false };
  }

  if (log.arcTxHash && typeof log.arcTxHash === "string" && log.arcTxHash.startsWith("0x")) {
    return { updated: false };
  }

  if (!process.env.CIRCLE_API_KEY) return { updated: false };

  const transfer = await getX402Transfer(gatewayTransferId).catch(() => null);
  if (!transfer) return { updated: false };

  const txHash = findEvmTxHashByKey(transfer);
  const next = txHash || null;
  const prev = log.arcTxHash || null;
  const nextStatus = transfer?.status || null;
  const prevStatus = log?.payment?.gatewayTransferStatus || null;

  const changed = prev !== next || prevStatus !== nextStatus;
  if (!changed) return { updated: false };

  log.arcTxHash = next;
  if (log.payment) {
    log.payment.arcTxHash = next;
    log.payment.gatewayTransferStatus = nextStatus;
  }
  return { updated: true };
}

function atomicFromUsdcCents(cents, decimals) {
  const c = Number(cents);
  const d = Number(decimals);
  if (!Number.isFinite(c) || c <= 0) throw new Error("Invalid cents amount");
  if (!Number.isInteger(d) || d < 2) {
    throw new Error(`Invalid USDC decimals (${decimals}); expected an integer >= 2`);
  }
  const scale = 10n ** BigInt(d - 2);
  return (BigInt(Math.trunc(c)) * scale).toString();
}

function atomicFromUsdcDecimal(amountUsdc, decimals) {
  const d = Number(decimals);
  if (!Number.isInteger(d) || d < 0) {
    throw new Error(`Invalid USDC decimals (${decimals}); expected a non-negative integer`);
  }

  const s =
    typeof amountUsdc === "number" ? amountUsdc.toFixed(Math.min(d, 12)) : String(amountUsdc);
  const trimmed = s.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`Invalid USDC amount: ${amountUsdc}`);

  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = BigInt(wholeRaw || "0");
  const fracPadded = (fracRaw + "0".repeat(d)).slice(0, d);
  const frac = BigInt(fracPadded || "0");
  const denom = 10n ** BigInt(d);
  return (whole * denom + frac).toString();
}

function hasCirclePaymentConfig() {
  return Boolean(
    process.env.CIRCLE_API_KEY &&
      process.env.CIRCLE_ENTITY_SECRET &&
      process.env.PAYER_WALLET_ID &&
      process.env.PAY_TO_ADDRESS,
  );
}

function allowMockPayments() {
  const raw = process.env.ALLOW_MOCK_PAYMENTS;
  return raw === "1" || String(raw || "").toLowerCase() === "true";
}

async function createCircleX402Receipt({ amountAtomic, payTo, memo, resource }) {
  const t0 = process.hrtime.bigint();
  const kind = await getArcTestnetKind();
  const payer = await getPayerWallet();

  if (payer.address.toLowerCase() === String(payTo).toLowerCase()) {
    throw new Error(
      "PAY_TO_ADDRESS must be different from the payer wallet address (x402 self-transfer is not allowed).",
    );
  }

  const authorization = makeEip3009Authorization({
    from: payer.address,
    to: payTo,
    value: amountAtomic,
  });

  const typedData = makeEip712TypedData({
    chainId: Number(kind.network.split(":")[1]),
    verifyingContract: kind.verifyingContract,
    name: kind.name,
    version: kind.version,
    authorization,
  });

  const signature = await signTypedData({
    walletId: payer.walletId,
    typedData,
    memo,
  });

  const resourceUri = resource || memo || "validly://step";
  // Circle Gateway currently expects a structured resource object.
  // The `url` is a stable identifier (it doesn't need to resolve publicly).
  const resourceObj = {
    url: `https://validly.local/x402?resource=${encodeURIComponent(resourceUri)}`,
    description: memo || "Validly step",
    mimeType: "application/json",
  };

  const paymentRequirements = {
    scheme: "exact",
    network: kind.network,
    asset: kind.usdc.address,
    amount: String(amountAtomic),
    payTo,
    resource: resourceObj,
    maxTimeoutSeconds: 3600,
    extra: {
      verifyingContract: kind.verifyingContract,
      name: kind.name,
      version: kind.version,
    },
  };

  const paymentPayload = {
    x402Version: kind.x402Version ?? 2,
    accepted: paymentRequirements,
    resource: resourceObj,
    payload: { signature, authorization },
  };

  // Debug logging for Circle Gateway request
  console.log("[x402] Sending to Circle Gateway /v1/x402/settle:", JSON.stringify({
    paymentRequirements: {
      ...paymentRequirements,
      amountUsdc: (() => {
        try {
          const decimals = kind.usdc.decimals ?? 6;
          const atomic = BigInt(String(paymentRequirements.amount));
          const denom = 10n ** BigInt(decimals);
          const whole = atomic / denom;
          const frac = atomic % denom;
          return `${whole.toString()}.${frac.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, "");
        } catch {
          return null;
        }
      })(),
    },
    paymentPayload
  }, null, 2));

  const settled = await settleX402Payment({ paymentPayload, paymentRequirements });

  // Debug logging for Circle Gateway response
  console.log("[x402] Circle Gateway settle response:", JSON.stringify(settled, null, 2));

  const transferId =
    typeof settled?.transaction === "string"
      ? settled.transaction
      : typeof settled?.transaction?.id === "string"
      ? settled.transaction.id
      : typeof settled?.transferId === "string"
      ? settled.transferId
      : typeof settled?.id === "string"
      ? settled.id
      : "";
  let transfer = null;
  if (transferId) {
    try {
      transfer = await getX402Transfer(transferId);
    } catch {
      // non-fatal; still return settle response
    }
  }
  const t1 = process.hrtime.bigint();

  return {
    ok: Boolean(settled?.success),
    errorReason: settled?.errorReason || null,
    network: settled?.network || kind.network,
    transferId,
    transfer,
    payer: settled?.payer || payer.address,
    settlementNs: Number(t1 - t0),
    kind,
    requirementMeta: {
      amount: paymentRequirements.amount,
      asset: paymentRequirements.asset,
      network: paymentRequirements.network,
      payTo: paymentRequirements.payTo,
      resource: paymentRequirements.resource,
    },
    authorizationMeta: {
      nonce: authorization.nonce,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      to: authorization.to,
      from: authorization.from,
      value: authorization.value,
    },
  };
}

function pickStatus() {
  const r = Math.random();
  if (r < 0.86) return "success";
  if (r < 0.93) return "failed";
  return "timeout";
}

function normalizeForcedStatus(value) {
  const allowed = new Set(["success", "failed", "timeout"]);
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function normalizeStepOutcome(value) {
  const allowed = new Set(["success", "failed", "timeout", "random"]);
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function resolvePlannedStatus({ forcedStatus, stepOutcomes, index }) {
  if (forcedStatus) return forcedStatus;
  const raw = Array.isArray(stepOutcomes) ? stepOutcomes[index] : null;
  const normalized = normalizeStepOutcome(raw);
  if (!normalized || normalized === "random") return pickStatus();
  return normalized;
}

async function executeRun({ runId, flow, body, forcedStatus, stepOutcomes, continueOnFailure }) {
  const db = await loadDb();
  const runIdx = db.runs.findIndex((r) => r.runId === runId);
  if (runIdx === -1) return;

  const paymentsEnabled = hasCirclePaymentConfig();
  const payer = paymentsEnabled ? await getPayerWallet().catch(() => null) : null;
  const mockPayerWallet = `0x${crypto.randomBytes(20).toString("hex")}`;

  const run = db.runs[runIdx];
  const steps = Array.isArray(run.steps) ? run.steps : [];
  let totalDurationMs = run.totalDurationMs || 0;
  let totalCostUsd = run.totalCostUsd || 0;
  let totalCostUsdc = run.totalCostUsdc || 0;
  let arcSettlementSum = 0;

  for (let i = 0; i < flow.steps.length; i++) {
    const stepCfg = flow.steps[i];
    const kind = stepCfg?.type || stepCfg?.kind;
    const providerId = stepCfg?.provider || stepCfg?.providerId;
    if (!kind || !providerId) continue;

    const step = getStep(kind);
    const provider = getProvider(kind, providerId);

    let status = resolvePlannedStatus({ forcedStatus, stepOutcomes, index: i });
    const durationMs = status === "timeout" ? 30000 : Math.round(80 + Math.random() * 2400);
    const fallbackUsdc = usdcFromCents(centsPerPaidCall());
    const requestedUsdc = status === "success" ? Number(provider.costUsd ?? fallbackUsdc) : 0;
    const requestedUsd = requestedUsdc;

    // Debug logging for pricing
    console.log(`[payment] ${step.label} via ${provider.name}: provider.costUsd=${provider.costUsd}, fallback=${fallbackUsdc}, final=${requestedUsdc}`);

    const payTo = process.env.PAY_TO_ADDRESS || `0x${crypto.randomBytes(20).toString("hex")}`;
    const settledAt = new Date(Date.now() + 1).toISOString();

    let paymentStatus = computePaymentStatus(status, requestedUsd);
    let arcTxHash = null;
    let nanopaymentId = null;
    let settlementNs = null;
    let invoiceId = null;
    let payerWallet = payer?.address || mockPayerWallet;
    let payeeWallet = payTo || `0x${crypto.randomBytes(20).toString("hex")}`;
    let paymentReason;
    let gatewayTransferId;
    let gatewayTransferStatus;
    let gatewayNetwork;
    let x402Version;
    let x402Asset;
    let authNonce;
    let authValidAfter;
    let authValidBefore;
    let reqAmount;
    let reqAsset;
    let reqNetwork;
    let reqPayTo;

    if (status === "success" && requestedUsd > 0 && paymentsEnabled) {
      try {
        const kindInfo = await getArcTestnetKind();
        const amountAtomic = atomicFromUsdcDecimal(requestedUsdc, kindInfo.usdc.decimals ?? 6);
        const receipt = await createCircleX402Receipt({
          amountAtomic,
          payTo,
          memo: `Validly ${flow.name} · ${step.label} · ${provider.name}`,
          resource: `validly://flow/${encodeURIComponent(flow.name)}/step/${encodeURIComponent(kind)}/${encodeURIComponent(provider.name)}`,
        });
        payerWallet = receipt.payer;
        payeeWallet = payTo;
        settlementNs = receipt.settlementNs;
        gatewayTransferId = receipt.transferId || "";
        gatewayTransferStatus = receipt.transfer?.status || null;
        gatewayNetwork = receipt.network || null;
        x402Version = receipt.kind?.x402Version || null;
        x402Asset = receipt.kind?.usdc?.address || null;
        authNonce = receipt.authorizationMeta?.nonce || null;
        authValidAfter = receipt.authorizationMeta?.validAfter || null;
        authValidBefore = receipt.authorizationMeta?.validBefore || null;
        reqAmount = receipt.requirementMeta?.amount || null;
        reqAsset = receipt.requirementMeta?.asset || null;
        reqNetwork = receipt.requirementMeta?.network || null;
        reqPayTo = receipt.requirementMeta?.payTo || null;

        arcTxHash = findEvmTxHashByKey(receipt.transfer) || null;
        nanopaymentId = gatewayTransferId;
        invoiceId = gatewayTransferId;

        if (!receipt.ok) {
          paymentStatus = "failed";
          paymentReason = receipt.errorReason || "x402 settlement failed";
          status = "failed";
        } else {
          paymentStatus = "paid";
        }
      } catch (e) {
        paymentStatus = "failed";
        paymentReason = e instanceof Error ? e.message : String(e);
        status = "failed";
      }
    }

    const paidUsdc = paymentStatus === "paid" ? requestedUsdc : 0;

    const log = {
      id: `log_${runId}_${i}`,
      runId,
      stepIndex: i,
      timestamp: new Date().toISOString(),
      flow: flow.name,
      userId: body?.userId || "usr_public",
      stepKind: kind,
      stepLabel: step.label,
      provider: provider.name,
      status,
      durationMs,
      costUsd: paidUsdc,
      costUsdc: paidUsdc,
      arcTxHash,
      arcSettlementNs: settlementNs,
      nanopaymentId,
      payment: {
        status: paymentStatus,
        rail: paymentsEnabled ? "x402" : "x402",
        amountUsdc: paidUsdc,
        requestedAmountUsdc: requestedUsdc,
        payerWallet,
        payeeWallet,
        arcTxHash,
        nanopaymentId,
        settlementNs,
        invoiceId,
        gatewayTransferId,
        gatewayTransferStatus,
        gatewayNetwork,
        x402Version,
        x402Asset,
        authorizationNonce: authNonce,
        authorizationValidAfter: authValidAfter,
        authorizationValidBefore: authValidBefore,
        requirementAmount: reqAmount,
        requirementAsset: reqAsset,
        requirementNetwork: reqNetwork,
        requirementPayTo: reqPayTo,
        payTo,
        settledAt,
        gasUsdc: null,
        reason:
          paymentStatus === "paid"
            ? undefined
            : paymentReason ||
              (paymentStatus === "pending"
                ? "Awaiting provider confirmation"
                : paymentStatus === "skipped"
                ? "No charge — provider returned error before billable work"
                : "Nanopayment rejected by provider"),
      },
      input: sampleInput(kind, body),
      output: sampleOutput(kind, status),
    };

    db.logs.unshift(log);
    steps.push(log);
    totalDurationMs += durationMs;
    totalCostUsd += paidUsdc;
    totalCostUsdc += paidUsdc;
    arcSettlementSum += settlementNs || 0;

    run.steps = steps;
    run.totalDurationMs = totalDurationMs;
    run.totalCostUsd = totalCostUsd;
    run.totalCostUsdc = totalCostUsdc;
    run.nanopaymentCount = steps.length;
    run.avgArcSettlementNs = steps.length ? Math.round(arcSettlementSum / steps.length) : 0;
    run.status = "running";
    db.runs[runIdx] = run;
    await saveDb(db, { flows: false, runs: true, logs: true });

    if (status !== "success" && !continueOnFailure) break;
  }

  const finalStatus = steps.some((s) => s.status === "timeout")
    ? "timeout"
    : steps.some((s) => s.status === "failed")
      ? "failed"
      : "success";
  run.status = finalStatus;
  run.endedAt = new Date().toISOString();
  run.avgArcSettlementNs = steps.length ? Math.round(arcSettlementSum / steps.length) : 0;
  db.runs[runIdx] = run;
  await saveDb(db, { flows: false, runs: true, logs: true });
}

function sampleInput(kind, userPayload) {
  const user = userPayload?.user || {};
  if (kind === "phone") return { phone: user.phone || "+14155550182", channel: "sms" };
  if (kind === "email") return { email: user.email || "alex@startup.io" };
  if (kind === "identity") return { documentType: "passport", country: "US" };
  if (kind === "address") return { line1: user.address || "1 Market St", city: "San Francisco", postal: "94105", country: "US" };
  if (kind === "bank") return { accountId: "acc_***82", routing: "021000021" };
  return { ip: user.ip || "73.92.14.221", deviceId: "d_92ab", email: user.email || "j.reyes@example.com" };
}

function sampleOutput(kind, status) {
  if (status === "timeout") return { error: "UPSTREAM_TIMEOUT", retryable: true };
  if (status === "failed") return { ok: false, error: "UPSTREAM_ERROR" };
  if (kind === "phone") return { verified: true, carrier: "Verizon", lineType: "mobile" };
  if (kind === "email") return { deliverable: true, disposable: false };
  if (kind === "identity") return { match: 0.97, liveness: "passed" };
  if (kind === "address") return { normalized: "1 Market Street, San Francisco, CA 94105, USA", confidence: 0.99 };
  if (kind === "bank") return { ownership: "verified", balance: 4218.55, currency: "USD" };
  return { riskScore: 12, decision: "allow" };
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    json(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/debug/pricing" && req.method === "GET") {
    const tests = [
      {kind: 'phone', id: 'twilio'},
      {kind: 'email', id: 'kickbox'},
      {kind: 'identity', id: 'persona'},
      {kind: 'address', id: 'google'},
      {kind: 'bank', id: 'plaid'}
    ];

    const results = tests.map(t => {
      const provider = getProvider(t.kind, t.id);
      return {
        kind: t.kind,
        providerId: t.id,
        providerName: provider.name,
        costUsd: provider.costUsd,
        hasNullish: provider.costUsd === null || provider.costUsd === undefined
      };
    });

    json(res, 200, { results });
    return;
  }

  if (pathname === "/api/circle/status" && req.method === "GET") {
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || "";
    const normalizedSecret = entitySecret.replace(/^['"]|['"]$/g, "");
    const payTo = process.env.PAY_TO_ADDRESS || "";

    const status = {
      ok: false,
      cwd: process.cwd(),
      arcExplorerBaseUrl: arcExplorerBaseUrl(),
      env: {
        dotenvPath: loadedDotEnvPath,
        dotenvCandidates: candidateDotEnvPaths(),
        hasApiKey: Boolean(process.env.CIRCLE_API_KEY),
        entitySecret: {
          present: Boolean(entitySecret),
          length: normalizedSecret.length,
          looksHex64: /^[0-9a-fA-F]{64}$/.test(normalizedSecret),
        },
        hasPayerWalletId: Boolean(process.env.PAYER_WALLET_ID),
        hasPayToAddress: Boolean(process.env.PAY_TO_ADDRESS),
        billUsdcCents: (() => {
          try {
            return centsPerPaidCall();
          } catch {
            return null;
          }
        })(),
        gatewayEnv: process.env.CIRCLE_GATEWAY_ENV || "testnet",
        hasGatewayApiKey: Boolean(process.env.CIRCLE_API_KEY),
      },
      payTo: payTo || null,
      payer: null,
      payerBalances: null,
      onchain: null,
      gateway: null,
      sign: null,
      errors: [],
    };

    try {
      if (!process.env.CIRCLE_API_KEY) {
        status.errors.push("Missing CIRCLE_API_KEY");
        json(res, 200, status);
        return;
      }
      if (!process.env.PAYER_WALLET_ID) status.errors.push("Missing PAYER_WALLET_ID");
      if (!process.env.PAY_TO_ADDRESS) status.errors.push("Missing PAY_TO_ADDRESS");
      if (!process.env.CIRCLE_ENTITY_SECRET) status.errors.push("Missing CIRCLE_ENTITY_SECRET");

      try {
        const payer = await getPayerWallet();
        status.payer = { walletId: payer.walletId, address: payer.address };
      } catch (e) {
        status.errors.push(e instanceof Error ? e.message : String(e));
      }

      if (status.payer?.walletId) {
        try {
          const balances = await getPayerTokenBalances();
          // Return a small, useful subset only.
          const normalized = balances.map((b) => ({
            tokenId: b.token?.id || null,
            tokenAddress: b.token?.tokenAddress || null,
            symbol: b.token?.symbol || null,
            blockchain: b.token?.blockchain || null,
            amount: b.amount || null,
          }));
          const usdc = normalized.find((b) => String(b.symbol).toUpperCase() === "USDC") || null;
          status.payerBalances = { usdc, count: normalized.length };
        } catch (e) {
          status.errors.push(e instanceof Error ? e.message : String(e));
        }
      }

      try {
        const kind = await getArcTestnetKind();
        status.gateway = {
          network: kind.network,
          usdc: kind.usdc?.address,
          usdcDecimals: kind.usdc?.decimals ?? null,
          verifyingContract: kind.verifyingContract,
          name: kind.name,
          version: kind.version,
          x402Version: kind.x402Version ?? null,
        };
      } catch (e) {
        status.errors.push(e instanceof Error ? e.message : String(e));
      }

      if (arcRpcUrl() && status.payer?.address && status.gateway?.usdc) {
        try {
          const usdcAddr = status.gateway.usdc;
          const balHex = await arcRpc("eth_call", [
            { to: usdcAddr, data: encodeBalanceOf(status.payer.address) },
            "latest",
          ]);
          const balAtomic = parseHexBigInt(balHex);
          const decimals = Number(status.gateway.usdcDecimals ?? 6);
          const denom = 10n ** BigInt(decimals);
          const whole = balAtomic / denom;
          const frac = balAtomic % denom;
          status.onchain = {
            rpcUrl: arcRpcUrl(),
            usdc: {
              atomic: balAtomic.toString(),
              decimal: `${whole.toString()}.${frac.toString().padStart(decimals, "0")}`.replace(/\.?0+$/, ""),
            },
          };
        } catch (e) {
          status.errors.push(e instanceof Error ? e.message : String(e));
        }
      }

      if (
        status.payer?.address &&
        status.gateway &&
        process.env.PAY_TO_ADDRESS &&
        process.env.CIRCLE_ENTITY_SECRET
      ) {
        try {
          const payToAddr = String(process.env.PAY_TO_ADDRESS);
          const authorization = makeEip3009Authorization({
            from: status.payer.address,
            to: payToAddr,
            value: "1", // 0.000001 USDC (6 decimals) - signing only, not settlement
          });

          const chainId = Number(String(status.gateway.network).split(":")[1]);
          const typedData = makeEip712TypedData({
            chainId,
            verifyingContract: status.gateway.verifyingContract,
            name: status.gateway.name,
            version: status.gateway.version,
            authorization,
          });

          await signTypedData({
            walletId: status.payer.walletId,
            typedData,
            memo: "Validly status check (no settlement)",
          });

          status.sign = { ok: true };
        } catch (e) {
          status.sign = { ok: false, error: e instanceof Error ? e.message : String(e) };
          status.errors.push(status.sign.error);
        }
      }

      status.ok = Boolean(status.sign?.ok) && status.errors.length === 0;
      json(res, 200, status);
      return;
    } catch (e) {
      status.errors.push(e instanceof Error ? e.message : String(e));
      json(res, 200, status);
      return;
    }
  }

  if (pathname === "/api/circle/transfer" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      badRequest(res, e instanceof Error ? e.message : "Invalid body");
      return;
    }

    const destinationAddress = String(body?.destinationAddress || process.env.PAY_TO_ADDRESS || "");
    const amountUsdc = String(body?.amountUsdc || usdcFromCents(centsPerPaidCall()));
    const refId = String(body?.refId || "validly_console_demo");

    if (!destinationAddress.startsWith("0x") || destinationAddress.length < 10) {
      badRequest(res, "Invalid destinationAddress");
      return;
    }

    try {
      const created = await createUsdcTransferTransaction({
        destinationAddress,
        amountUsdc,
        refId,
      });
      json(res, 200, { ok: true, created });
      return;
    } catch (e) {
      json(res, 400, { ok: false, error: { message: e instanceof Error ? e.message : String(e) } });
      return;
    }
  }

  if (pathname.startsWith("/api/circle/tx/") && req.method === "GET") {
    const id = pathname.split("/").pop();
    if (!id) return notFound(res);
    try {
      const tx = await getCircleTransaction(id);
      json(res, 200, { ok: true, transaction: tx });
      return;
    } catch (e) {
      json(res, 400, { ok: false, error: { message: e instanceof Error ? e.message : String(e) } });
      return;
    }
  }

  // ---- Gateway Balance ----
  if (pathname === "/api/gateway/balance" && req.method === "GET") {
    if (!hasCirclePaymentConfig()) {
      json(res, 200, {
        ok: false,
        message: "Circle Gateway not configured",
        balanceUsdc: 0
      });
      return;
    }

    try {
      const payer = await getPayerWallet();
      const balanceUsdc = await getGatewayBalance(payer.address);

      json(res, 200, {
        ok: true,
        address: payer.address,
        balanceUsdc,
        balanceAtomic: Math.floor(balanceUsdc * 1_000_000),
        network: "eip155:5042002",
        gatewayContract: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
      });
      return;
    } catch (e) {
      json(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      });
      return;
    }
  }

  // ---- Flows ----
  if (pathname === "/api/flows" && req.method === "GET") {
    const db = await loadDb();
    json(res, 200, { flows: db.flows });
    return;
  }

  if (pathname === "/api/flows" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      badRequest(res, e instanceof Error ? e.message : "Invalid body");
      return;
    }

    const name = normalizeFlowName(body?.name) || "us_onboarding";
    const steps = Array.isArray(body?.steps) ? body.steps : [];
    const now = new Date().toISOString();
    const flow = {
      id: id("flow"),
      name,
      steps,
      createdAt: now,
      updatedAt: now,
    };

    const db = await loadDb();
    db.flows.unshift(flow);
    await saveDb(db, { flows: true, runs: false, logs: false });
    json(res, 201, { flow });
    return;
  }

  if (pathname.startsWith("/api/flows/") && req.method === "GET") {
    const flowId = pathname.split("/").pop();
    const db = await loadDb();
    const flow = db.flows.find((f) => f.id === flowId);
    if (!flow) return notFound(res);
    json(res, 200, { flow });
    return;
  }

  if (pathname.startsWith("/api/flows/") && req.method === "PUT") {
    const flowId = pathname.split("/").pop();
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      badRequest(res, e instanceof Error ? e.message : "Invalid body");
      return;
    }
    const db = await loadDb();
    const idx = db.flows.findIndex((f) => f.id === flowId);
    if (idx === -1) return notFound(res);

    const prev = db.flows[idx];
    const next = {
      ...prev,
      name: normalizeFlowName(body?.name) || prev.name,
      steps: Array.isArray(body?.steps) ? body.steps : prev.steps,
      updatedAt: new Date().toISOString(),
    };
    db.flows[idx] = next;
    await saveDb(db, { flows: true, runs: false, logs: false });
    json(res, 200, { flow: next });
    return;
  }

  // ---- Runs ----
  if (pathname === "/api/runs" && req.method === "GET") {
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const db = await loadDb();
    const runs = db.runs.slice(0, limit).map((r) => hydrateRunFromLogs(r, db.logs));
    json(res, 200, { runs });
    return;
  }

  if (pathname.startsWith("/api/runs/") && req.method === "GET") {
    const runId = pathname.split("/").pop();
    const db = await loadDb();
    const run = db.runs.find((r) => r.runId === runId);
    if (!run) return notFound(res);
    json(res, 200, { run: hydrateRunFromLogs(run, db.logs) });
    return;
  }

  if (pathname.startsWith("/api/x402/transfers/") && req.method === "GET") {
    const id = pathname.split("/").pop();
    if (!id) return notFound(res);
    try {
      const transfer = await getX402Transfer(id);
      json(res, 200, { ok: true, transfer });
    } catch (e) {
      json(res, 200, {
        ok: false,
        error: { message: e instanceof Error ? e.message : String(e) },
      });
    }
    return;
  }

  if (pathname === "/api/logs" && req.method === "GET") {
    const runId = url.searchParams.get("runId");
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);
    const db = await loadDb();
    const hydrate = url.searchParams.get("hydrate") !== "0";
    const hydrateLimitRaw = Number(url.searchParams.get("hydrateLimit") || 25);
    const hydrateLimit = Number.isFinite(hydrateLimitRaw)
      ? Math.min(Math.max(0, Math.trunc(hydrateLimitRaw)), 200)
      : 25;
    const hydrateTimeoutMsRaw = Number(url.searchParams.get("hydrateTimeoutMs") || 1500);
    const hydrateTimeoutMs = Number.isFinite(hydrateTimeoutMsRaw)
      ? Math.min(Math.max(0, Math.trunc(hydrateTimeoutMsRaw)), 10_000)
      : 1500;
    const logs = runId ? db.logs.filter((l) => l.runId === runId) : db.logs;
    const sliced = logs.slice(0, limit);

    let updated = 0;
    if (hydrate) {
      const maxHydrate = Math.min(sliced.length, hydrateLimit);
      const t0 = Date.now();
      const concurrency = Math.max(
        1,
        Math.min(20, Number(process.env.TRANSFER_HYDRATE_CONCURRENCY || 6)),
      );
      let cursor = 0;
      async function worker() {
        while (cursor < maxHydrate && Date.now() - t0 < hydrateTimeoutMs) {
          const i = cursor++;
          const out = await hydrateLogArcTxHashFromGateway(sliced[i]).catch(() => ({ updated: false }));
          if (out.updated) updated++;
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, maxHydrate) }, () => worker()));
      if (updated > 0) await saveDb(db, { flows: false, runs: false, logs: true });
    }

    json(res, 200, { logs: sliced });
    return;
  }

  if (pathname === "/api/runs" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      badRequest(res, e instanceof Error ? e.message : "Invalid body");
      return;
    }

    if (!allowMockPayments() && !hasCirclePaymentConfig()) {
      json(res, 503, {
        ok: false,
        error: {
          message:
            "Circle payments are not configured. Set CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, PAYER_WALLET_ID, and PAY_TO_ADDRESS in .env (or set ALLOW_MOCK_PAYMENTS=true for demo-only mode).",
        },
      });
      return;
    }

    const db = await loadDb();
    const flowId = body?.flowId;
    const flow = db.flows.find((f) => f.id === flowId);
    if (!flow) {
      badRequest(res, "Unknown flowId");
      return;
    }

    const forcedStatus = normalizeForcedStatus(body?.forceStatus);
    const stepOutcomes = Array.isArray(body?.stepOutcomes) ? body.stepOutcomes : null;
    const continueOnFailure = Boolean(body?.continueOnFailure);
    const asyncMode = body?.async !== false;

    const runId = id("run");
    const startedAt = new Date().toISOString();

    // Estimate expected cost (so we can preflight Gateway balance before starting).
    let expectedPaidSteps = 0;
    let estimatedCostUsdc = 0;
    for (let i = 0; i < flow.steps.length; i++) {
      const planned = forcedStatus ? forcedStatus : normalizeStepOutcome(stepOutcomes?.[i]);
      const isNonSuccess = planned === "failed" || planned === "timeout";
      expectedPaidSteps += isNonSuccess ? 0 : 1;
      if (!isNonSuccess) {
        const stepCfg = flow.steps[i];
        const kind = stepCfg?.type || stepCfg?.kind;
        const providerId = stepCfg?.provider || stepCfg?.providerId;
        if (kind && providerId) {
          const provider = getProvider(kind, providerId);
          const fallbackUsdc = usdcFromCents(centsPerPaidCall());
          estimatedCostUsdc += Number(provider.costUsd ?? fallbackUsdc);
        }
      }
      if (!continueOnFailure && isNonSuccess) break;
    }
    // expectedPaidSteps retained for debugging/telemetry if needed

    // NEW: Pre-flight balance check - verify sufficient Gateway balance BEFORE doing work
    if (hasCirclePaymentConfig() && estimatedCostUsdc > 0) {
      try {
        const payer = await getPayerWallet();
        const gatewayBalance = await getGatewayBalance(payer.address);

        console.log(`[pre-flight] Gateway balance: ${gatewayBalance.toFixed(6)} USDC, Required: ${estimatedCostUsdc.toFixed(6)} USDC`);

        if (gatewayBalance < estimatedCostUsdc) {
          const deficit = estimatedCostUsdc - gatewayBalance;
          json(res, 402, { // 402 Payment Required
            error: "Insufficient Gateway balance",
            code: "INSUFFICIENT_GATEWAY_BALANCE",
            currentBalance: gatewayBalance,
            requiredAmount: estimatedCostUsdc,
            deficit: deficit,
            message: `Your Gateway balance (${gatewayBalance.toFixed(4)} USDC) is insufficient for this flow (${estimatedCostUsdc.toFixed(4)} USDC). Please deposit at least ${Math.ceil(deficit * 100) / 100} USDC.`,
            fixCommand: `npm run circle:deposit -- --amount ${Math.ceil(deficit)}`
          });
          return;
        }
      } catch (e) {
        console.error('[pre-flight] Failed to check Gateway balance:', e.message);
        // Continue execution (don't block on balance check failure)
        // The actual payment will fail later if there's truly insufficient balance
      }
    }

    const run = {
      runId,
      flow: flow.name,
      userId: body?.userId || "usr_public",
      startedAt,
      endedAt: startedAt,
      totalDurationMs: 0,
      totalCostUsd: 0,
      totalCostUsdc: 0,
      avgArcSettlementNs: 0,
      nanopaymentCount: 0,
      status: "running",
      steps: [],
    };

    db.runs.unshift(run);
    await saveDb(db, { flows: false, runs: true, logs: false });
    if (asyncMode) {
      json(res, 201, { run });
      executeRun({ runId, flow, body, forcedStatus, stepOutcomes, continueOnFailure }).catch((e) => {
        console.error("[run] execution failed:", e instanceof Error ? e.message : e);
      });
      return;
    }

    await executeRun({ runId, flow, body, forcedStatus, stepOutcomes, continueOnFailure });
    const latestDb = await loadDb();
    const completed = latestDb.runs.find((r) => r.runId === runId) || run;
    json(res, 201, { run: completed });
    return;
  }

  // Serve static files from dist/ folder (production build)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, "../dist");

  // Try to serve static file
  const filePath = pathname === "/" ? path.join(distPath, "index.html") : path.join(distPath, pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    }[ext] || "application/octet-stream";

    res.writeHead(200, { "content-type": contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to index.html for SPA routing (if not an API route)
  if (!pathname.startsWith("/api/")) {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "content-type": "text/html" });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  notFound(res);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    json(res, 500, { error: { message: e instanceof Error ? e.message : "Server error" } });
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${PORT}`);
});
