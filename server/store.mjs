import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "server", "data");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJson(filename, fallbackValue) {
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
