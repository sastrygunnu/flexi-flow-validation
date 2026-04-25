const DEFAULT_ARC_EXPLORER_BASE_URL = "https://testnet.arcscan.app";

export const ARC_EXPLORER_BASE_URL =
  import.meta.env.VITE_ARC_EXPLORER_BASE_URL || DEFAULT_ARC_EXPLORER_BASE_URL;

export function normalizeEvmTxHash(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  const with0x = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]{64}$/.test(with0x)) return null;
  return `0x${with0x.toLowerCase()}`;
}

export function arcTxUrl(txHash?: string | null): string | null {
  const normalized = normalizeEvmTxHash(txHash);
  if (!normalized) return null;
  const base = ARC_EXPLORER_BASE_URL.replace(/\/+$/, "");
  return `${base}/tx/${normalized}`;
}

