import test from "node:test";
import assert from "node:assert/strict";
import { validate, buildMessages, pickStyle } from "../api/generate.js";

const base = { eventName: "Gala", rating: 5, highlights: ["Food"], comment: "", who: "", tone: "malaysian", language: "English" };

test("malaysian tone is accepted and used", () => {
  assert.equal(validate({ rating: 5, tone: "malaysian" }).value.tone, "malaysian");
  assert.match(pickStyle(base, () => 0.3).voice, /Malaysian casual/);
});

test("prompt asks for plain everyday words and bans polished wording", () => {
  const m = buildMessages(base, () => 0.2);
  assert.match(m[0].content, /plain everyday words/);
  assert.match(m[0].content, /"delightful"/);
  assert.match(m[0].content, /not read like marketing copy/);
  assert.match(m[1].content, /Malaysian casual/);
});

test("most random lengths are short", () => {
  let short = 0, seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 300; i++) {
    if (/one|two or three/.test(pickStyle({ ...base, tone: "auto" }, rng).length)) short++;
  }
  assert.ok(short > 215, "expected mostly short drafts, got " + short + "/300");
});
