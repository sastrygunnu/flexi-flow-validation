import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "server", "data");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readJson(filename, fallbackValue) {
  await ensureDataDir();
  const filePath = path.join(dataDir, filename);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error(`Missing data file: ${filePath}`);
  }
}

export async function writeJson(filename, value) {
  await ensureDataDir();
  const filePath = path.join(dataDir, filename);
  await writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

