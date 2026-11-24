import test from "node:test";
import assert from "node:assert/strict";
import handler, { validate, buildMessages, pickStyle } from "../api/generate.js";

const base = { eventName: "Gala", rating: 5, highlights: ["Food"], comment: "", who: "", tone: "auto", language: "English" };

test("validate keeps tone and companion, and defaults bad tone to auto", () => {
  const ok = validate({ rating: 4, tone: "casual", who: " Colleagues " }).value;
  assert.equal(ok.tone, "casual");
  assert.equal(ok.who, "Colleagues");
  assert.equal(validate({ rating: 4, tone: "angry" }).value.tone, "auto");
});

test("different random draws give different styles", () => {
  const seen = new Set();
  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 40; i++) {
    const s = pickStyle(base, rng);
    seen.add(s.voice + "|" + s.length + "|" + s.opening);
  }
  assert.ok(seen.size >= 12, "expected many distinct style combinations, got " + seen.size);
});

test("chosen tone overrides the random voice", () => {
  const s = pickStyle({ ...base, tone: "professional" }, () => 0.01);
  assert.match(s.voice, /professional/i);
});

test("prompt includes cliche ban list, style block, companion and facts-only rule", () => {
  const m = buildMessages({ ...base, who: "Family" }, () => 0.5);
  assert.match(m[0].content, /highly recommend/);
  assert.match(m[0].content, /Never invent facts/);
  assert.match(m[1].content, /Style for this particular review/);
  assert.match(m[1].content, /"went_with":"Family"/);
});

test("retries once with plain settings when the model rejects sampling options", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    if (calls.length === 1) return { ok: false, status: 400, text: async () => "unsupported" };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "Fun night, loved the food." } }] }) };
  };
  const r = { code: 200, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };
  await handler({ method: "POST", headers: { "x-forwarded-for": "5.5.5.5" }, body: { rating: 5 } }, r);
  assert.equal(r.code, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].temperature, 1);
  assert.equal(calls[1].temperature, undefined);
  assert.equal(calls[1].max_completion_tokens, 260);
});
