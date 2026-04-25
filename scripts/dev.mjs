import { spawn } from "node:child_process";

const server = spawn("node", ["server/index.mjs"], {
  stdio: "inherit",
  env: process.env,
});

const vite = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
  stdio: "inherit",
  env: process.env,
});

function shutdown(code) {
  try { server.kill("SIGTERM"); } catch {}
  try { vite.kill("SIGTERM"); } catch {}
  process.exit(code ?? 0);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

server.on("exit", (code) => shutdown(code ?? 0));
vite.on("exit", (code) => shutdown(code ?? 0));

