import { handle } from "../server/index.mjs";

export default async function handler(req, res) {
  try {
    await handle(req, res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { message } }));
  }
}
