import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/generate.js";

const mkRes = () => ({ code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });

test("uses Gemini when GEMINI_API_KEY is set and parses the reply", async () => {
  process.env.GEMINI_API_KEY = "g-test";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.GEMINI_MODEL = "test-gem";
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "Food was good lah, nice night." }] } }] }) };
  };
  const r = mkRes();
  await handler({ method: "POST", headers: { "x-forwarded-for": "3.3.3.3" }, body: { rating: 5, highlights: ["Food"], tone: "malaysian" } }, r);
  assert.equal(r.code, 200);
  assert.equal(r.body.review, "Food was good lah, nice night.");
  assert.match(seen.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/test-gem:generateContent\?key=g-test$/);
  assert.match(seen.body.systemInstruction.parts[0].text, /Never invent facts/);
  assert.match(seen.body.contents[0].parts[0].text, /Malaysian casual/);
  assert.equal(seen.body.generationConfig.maxOutputTokens, 500);
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

test("AI_PROVIDER=openai forces OpenAI even if a Gemini key exists", async () => {
  process.env.GEMINI_API_KEY = "g-test";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.AI_PROVIDER = "openai";
  let url;
  globalThis.fetch = async (u) => { url = u; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) }; };
  const r = mkRes();
  await handler({ method: "POST", headers: { "x-forwarded-for": "3.3.3.4" }, body: { rating: 4 } }, r);
  assert.match(url, /api\.openai\.com/);
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_PROVIDER;
});

test("Gemini failure gives 502 and does not leak the key or details", async () => {
  process.env.GEMINI_API_KEY = "g-secret-key";
  globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => "quota detail" });
  const r = mkRes();
  await handler({ method: "POST", headers: { "x-forwarded-for": "3.3.3.5" }, body: { rating: 4 } }, r);
  assert.equal(r.code, 502);
  assert.ok(!JSON.stringify(r.body).includes("g-secret-key"));
  assert.ok(!JSON.stringify(r.body).includes("quota detail"));
  delete process.env.GEMINI_API_KEY;
});
