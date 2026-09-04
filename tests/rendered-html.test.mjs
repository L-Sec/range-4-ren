import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the investigative estimator shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");

  const html = await response.text();
  assert.match(html, /<title>Range 4-Ren — Investigative Range Estimator<\/title>/i);
  assert.match(html, /Range 4-Ren/);
  assert.match(html, /Investigative Range Estimator/);
  assert.match(html, /INPUT PARAMETERS/);
  assert.match(html, /RECOVERY LOCATION/);
  assert.match(html, /Basemap[\s\S]{0,20}off/);
  assert.match(html, /Possible Launch Area \(wind-corrected\)/);
  assert.match(html, /Radio-link constraint/);
  assert.match(html, /Suitable launch overlap/);
  assert.match(html, /Export GeoJSON/);
});
