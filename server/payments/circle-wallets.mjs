import crypto from "node:crypto";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let cachedClient;
let cachedPayer;

export function getCircleWalletsClient() {
  if (cachedClient) return cachedClient;
  cachedClient = initiateDeveloperControlledWalletsClient({
    apiKey: required("CIRCLE_API_KEY"),
    entitySecret: required("CIRCLE_ENTITY_SECRET"),
  });
  return cachedClient;
}

export async function getPayerWallet() {
  if (cachedPayer) return cachedPayer;
  const walletId = required("PAYER_WALLET_ID");
  const client = getCircleWalletsClient();
  const wallet = (await client.getWallet({ id: walletId })).data?.wallet;
  if (!wallet?.address) throw new Error("Could not resolve payer wallet address from Circle");
  cachedPayer = { walletId, address: wallet.address };
  return cachedPayer;
}

export async function getPayerTokenBalances() {
  const walletId = required("PAYER_WALLET_ID");
  const client = getCircleWalletsClient();
  const balances = (await client.getWalletTokenBalance({ id: walletId, includeAll: true }))
    .data?.tokenBalances;
  return Array.isArray(balances) ? balances : [];
}

async function getUsdcTokenRef() {
  const balances = await getPayerTokenBalances();
  const usdc = balances.find((b) => String(b?.token?.symbol || "").toUpperCase() === "USDC");
  if (!usdc?.token) {
    throw new Error("Could not resolve USDC token reference for payer wallet");
  }
  return {
    tokenId: usdc.token.id,
    tokenAddress: usdc.token.tokenAddress ?? null,
    blockchain: usdc.token.blockchain ?? null,
  };
}

export async function createUsdcTransferTransaction({
  destinationAddress,
  amountUsdc,
  refId,
}) {
  const walletId = required("PAYER_WALLET_ID");
  const client = getCircleWalletsClient();
  const tokenRef = await getUsdcTokenRef();

  const resp = await client.createTransaction({
    walletId,
    destinationAddress,
    amount: [String(amountUsdc)],
    ...(tokenRef.tokenId
      ? { tokenId: tokenRef.tokenId }
      : tokenRef.tokenAddress && tokenRef.blockchain
        ? { tokenAddress: tokenRef.tokenAddress, blockchain: tokenRef.blockchain }
        : {}),
    fee: {
      type: "level",
      config: { feeLevel: "LOW" },
    },
    idempotencyKey: crypto.randomUUID(),
    ...(refId ? { refId } : {}),
  });

  return resp.data ?? null;
}

export async function getCircleTransaction(id) {
  const client = getCircleWalletsClient();
  const resp = await client.getTransaction({ id });
  return resp.data?.transaction ?? null;
}

export function makeEip3009Authorization({ from, to, value }) {
  const now = Math.floor(Date.now() / 1000);
  const validitySecondsRaw = process.env.EIP3009_VALIDITY_SECONDS;
  const validitySeconds =
    validitySecondsRaw && validitySecondsRaw !== ""
      ? Number(validitySecondsRaw)
      : 7 * 24 * 60 * 60; // 7d default
  if (!Number.isFinite(validitySeconds) || validitySeconds <= 0) {
    throw new Error("EIP3009_VALIDITY_SECONDS must be a positive number (seconds)");
  }

  // Circle Gateway requires a sufficiently long validity window.
  // Use validAfter=0 to be immediately valid and maximize the effective window.
  const minValiditySeconds = 24 * 60 * 60; // 24h
  const effectiveValiditySeconds = Math.max(minValiditySeconds, Math.floor(validitySeconds));

  const validAfter = "0";
  const validBefore = String(now + effectiveValiditySeconds);
  const nonce = `0x${crypto.randomBytes(32).toString("hex")}`;
  return { from, to, value: String(value), validAfter, validBefore, nonce };
}

export function makeEip712TypedData({
  chainId,
  verifyingContract,
  name,
  version,
  authorization,
}) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    domain: { name, version, chainId, verifyingContract },
    primaryType: "TransferWithAuthorization",
    message: authorization,
  };
}

export async function signTypedData({ walletId, typedData, memo }) {
  const client = getCircleWalletsClient();
  const resp = await client.signTypedData({
    walletId,
    data: JSON.stringify(typedData),
    memo,
  });
  const signature = resp.data?.signature;
  if (!signature) throw new Error("Circle signTypedData returned no signature");
  return signature;
}
