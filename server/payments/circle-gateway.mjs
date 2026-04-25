import crypto from "node:crypto";

const TESTNET_BASE_URL = "https://gateway-api-testnet.circle.com";
const MAINNET_BASE_URL = "https://gateway-api.circle.com";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function gatewayBaseUrl() {
  const env = (process.env.CIRCLE_GATEWAY_ENV || "testnet").toLowerCase();
  return env === "mainnet" ? MAINNET_BASE_URL : TESTNET_BASE_URL;
}

function gatewayAuthHeaders() {
  const key = process.env.CIRCLE_API_KEY;
  if (!key) return {};
  return { authorization: `Bearer ${key}` };
}

async function gatewayRequest(path, init, { requireAuth = false } = {}) {
  const url = `${gatewayBaseUrl()}${path}`;
  if (requireAuth && !process.env.CIRCLE_API_KEY) {
    throw new Error(
      "Missing CIRCLE_API_KEY (create a Gateway testnet API key in Circle Console and set it in .env).",
    );
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID(),
      ...gatewayAuthHeaders(),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `Gateway ${res.status}: ${text || res.statusText}`;
    throw new Error(msg);
  }
  return json;
}

let cachedSupported;

export async function getSupportedKinds() {
  if (cachedSupported) return cachedSupported;
  cachedSupported = await gatewayRequest("/v1/x402/supported", { method: "GET" });
  return cachedSupported;
}

export async function getArcTestnetKind() {
  const supported = await getSupportedKinds();
  const kind = supported?.kinds?.find(
    (k) => k.scheme === "exact" && k.network === "eip155:5042002",
  );
  if (!kind) throw new Error("Circle Gateway does not list Arc testnet in /v1/x402/supported");
  if (!kind.extra?.verifyingContract) {
    throw new Error("Circle Gateway supported kind missing verifyingContract");
  }
  const usdc = kind.extra?.assets?.find((a) => a.symbol === "USDC");
  if (!usdc?.address) throw new Error("Circle Gateway supported kind missing USDC asset");
  return {
    x402Version: kind.x402Version,
    scheme: kind.scheme,
    network: kind.network,
    name: kind.extra?.name || "GatewayWalletBatched",
    version: kind.extra?.version || "1",
    verifyingContract: kind.extra?.verifyingContract,
    usdc: { address: usdc.address, decimals: usdc.decimals ?? 6 },
  };
}

export async function settleX402Payment({ paymentPayload, paymentRequirements }) {
  return gatewayRequest("/v1/x402/settle", {
    method: "POST",
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  }, { requireAuth: true });
}

export async function getX402Transfer(id) {
  return gatewayRequest(`/v1/x402/transfers/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

/**
 * Get Gateway balance for a wallet address by querying the Gateway contract on-chain
 * @param {string} walletAddress - The wallet address to check balance for
 * @returns {Promise<number>} Balance in USDC (decimal, not atomic)
 */
export async function getGatewayBalance(walletAddress) {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
  const gatewayContract = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';

  // ERC-20 balanceOf(address) function selector
  const BALANCE_OF_SELECTOR = '0x70a08231';
  const paddedAddress = walletAddress.replace('0x', '').toLowerCase().padStart(64, '0');

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: gatewayContract,
          data: BALANCE_OF_SELECTOR + paddedAddress
        },
        'latest'
      ],
      id: 1
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const balanceHex = data.result;
  const balanceAtomic = parseInt(balanceHex, 16);
  const balanceUsdc = balanceAtomic / 1_000_000; // USDC has 6 decimals

  return balanceUsdc;
}
