// Vercel Serverless Function wrapper for the Node.js server
import { createServer } from '../server/index.mjs';

let handler;

export default async function (req, res) {
  if (!handler) {
    handler = await createServer();
  }
  return handler(req, res);
}
