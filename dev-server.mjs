// Local test server: serves /public and runs api/generate.js, no Vercel account needed.
// Usage: copy .env.example to .env, add your key, then: npm run dev
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (existsSync(path.join(root, ".env"))) {
  for (const line of readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && m[2] !== "" && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const { default: handler } = await import(pathToFileURL(path.join(root, "api", "generate.js")).href);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const port = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/generate") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString() || "null"); } catch { body = null; }
    req.body = body;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
    return handler(req, res);
  }
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const file = path.join(root, "public", path.normalize(rel));
  if (!file.startsWith(path.join(root, "public"))) { res.statusCode = 403; return res.end("Forbidden"); }
  try {
    const data = await readFile(file);
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(port, () => console.log("Open http://localhost:" + port + (process.env.OPENAI_API_KEY ? "" : "  (no OPENAI_API_KEY set: drafts will use the basic fallback)")));
