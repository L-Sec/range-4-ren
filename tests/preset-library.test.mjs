import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/drone-presets.ts", import.meta.url),
  "utf8",
);

test("contains ten commercial presets in each aircraft category", () => {
  for (const category of ["micro", "camera", "heavy", "fixed"]) {
    const count = source.match(new RegExp(`category: "${category}"`, "g"))?.length ?? 0;
    assert.equal(count, 10, `${category} should contain exactly ten presets`);
  }
});

test("preset identifiers and source links are complete", () => {
  const ids = [...source.matchAll(/\bid: "([^"]+)"/g)].map((match) => match[1]);
  const sources = [...source.matchAll(/\bsource: "(https:\/\/[^"]+)"/g)].map((match) => match[1]);

  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, ids.length, "preset IDs must be unique");
  assert.equal(sources.length, 40, "each preset should include an audit source");
});

test("every preset has a published radio-link starting value", () => {
  const ids = [...source.matchAll(/\bid: "([^"]+)"/g)].map((match) => match[1]);
  const radioBlock = source.match(/const RADIO_RANGE_KM:[^{]+\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const radioIds = [...radioBlock.matchAll(/"([^"]+)":/g)].map((match) => match[1]);

  assert.equal(radioIds.length, 40);
  assert.deepEqual(new Set(radioIds), new Set(ids));
});
