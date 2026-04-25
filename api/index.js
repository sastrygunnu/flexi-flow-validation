import { handle } from "../server/index.mjs";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const path = url.searchParams.get("path");

    // When routed via vercel.json, we pass the original /api/* path as ?path=...
    // Reconstruct req.url so the shared router can match on pathname.
    if (path) {
      url.searchParams.delete("path");
      const qs = url.searchParams.toString();
      req.url = `/api/${path}${qs ? `?${qs}` : ""}`;
    }

    await handle(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { message } }));
  }
}

