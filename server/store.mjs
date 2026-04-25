import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function resolveDataDir() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  // Vercel (and many serverless hosts) expose a writable /tmp but no persistent filesystem.
  // Using /tmp at least enables flows/logs within a warm instance for demos.
  if (process.env.VERCEL) return path.join("/tmp", "validly-data");
  return path.resolve(process.cwd(), "server", "data");
}

const dataDir = resolveDataDir();

function hasSupabaseStorage() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseStorage() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = process.env.SUPABASE_BUCKET || "validly";
  const prefix = (process.env.SUPABASE_PREFIX || "db").replace(/^\/+|\/+$/g, "");
  return { client, bucket, prefix };
}

export function storeInfo() {
  const usingSupabase = hasSupabaseStorage();
  const storage = usingSupabase ? supabaseStorage() : null;
  return {
    mode: usingSupabase ? "supabase" : "fs",
    dataDir,
    supabase: storage
      ? { bucket: storage.bucket, prefix: storage.prefix, configured: true }
      : { bucket: process.env.SUPABASE_BUCKET || "validly", prefix: process.env.SUPABASE_PREFIX || "db", configured: false },
  };
}

function isMissingObjectError(error) {
  if (!error) return false;
  const status = error.statusCode || error.status;
  if (status === 404) return true;
  const msg = String(error.message || "");
  return /not\s*found/i.test(msg);
}

async function blobToText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data instanceof Uint8Array) return Buffer.from(data).toString("utf8");
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (typeof data.text === "function") return data.text();
  if (typeof data.arrayBuffer === "function") {
    const ab = await data.arrayBuffer();
    return Buffer.from(ab).toString("utf8");
  }
  return String(data);
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJson(filename, fallbackValue) {
  // Prefer Supabase Storage when configured, but gracefully fall back to local FS
  // (e.g., when the bucket/object isn't created yet or Storage is temporarily unavailable).
  if (hasSupabaseStorage()) {
    const storage = supabaseStorage();
    if (storage) {
      const objectPath = `${storage.prefix}/${filename}`;
      try {
        const { data, error } = await storage.client.storage
          .from(storage.bucket)
          .download(objectPath);
        if (!error) {
          const raw = await blobToText(data);
          return JSON.parse(raw);
        }
        // Fall through to FS if missing/unavailable; FS is still useful for local dev and best-effort demos.
      } catch {
        // Fall through to FS.
      }
    }
  }

  await ensureDataDir();
  const filePath = path.join(dataDir, filename);
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      const shouldRetry =
        attempt < maxAttempts &&
        e &&
        typeof e === "object" &&
        ("name" in e || "code" in e) &&
        (e.name === "SyntaxError" || e.code === "EACCES");
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, 25 * attempt));
        continue;
      }

      if (fallbackValue !== undefined) return fallbackValue;
      throw new Error(`Missing/invalid data file: ${filePath}`);
    }
  }
}

export async function writeJson(filename, value) {
  if (hasSupabaseStorage()) {
    const storage = supabaseStorage();
    if (storage) {
      const objectPath = `${storage.prefix}/${filename}`;
      const body = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
      const { error } = await storage.client.storage
        .from(storage.bucket)
        .upload(objectPath, body, { upsert: true, contentType: "application/json" });
      if (!error) return;
      // Fall back to local FS if storage isn't set up yet (e.g., bucket missing).
    }
  }

  await ensureDataDir();
  const filePath = path.join(dataDir, filename);
  const tmpPath = `${filePath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  await writeFile(tmpPath, JSON.stringify(value, null, 2) + "\n", "utf8");
  try {
    await rename(tmpPath, filePath);
  } catch (e) {
    // Windows rename won't overwrite; do a best-effort replace.
    await rm(filePath, { force: true }).catch(() => {});
    await rename(tmpPath, filePath);
  }
}
