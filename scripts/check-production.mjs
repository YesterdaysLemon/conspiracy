import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const baseUrl = new URL(process.argv[2] ?? "http://127.0.0.1:3000/");
const tokenSource = await readFile(new URL("../src/webmcp/originTrial.ts", import.meta.url), "utf8");
const tokenMatch = tokenSource.match(/WEBMCP_ORIGIN_TRIAL_TOKEN\s*=\s*\n?\s*"([^"]+)"/);

assert(tokenMatch, "could not read the expected WebMCP origin-trial token");
const expectedToken = tokenMatch[1];

const healthResponse = await fetch(new URL("/healthz", baseUrl), { cache: "no-store" });
assert.equal(healthResponse.status, 200, "health endpoint must return HTTP 200");
assert.match(healthResponse.headers.get("content-type") ?? "", /^application\/json\b/i);
assert.deepEqual(await healthResponse.json(), { ok: true, service: "conspiracy" });

const headResponse = await fetch(new URL("/healthz", baseUrl), { method: "HEAD", cache: "no-store" });
assert.equal(headResponse.status, 200, "health endpoint must support HEAD probes");

const pageResponse = await fetch(baseUrl, { cache: "no-store" });
assert.equal(pageResponse.status, 200, "case board must return HTTP 200");
assert.equal(
  pageResponse.headers.get("origin-trial"),
  expectedToken,
  "case board must deliver the exact WebMCP Origin-Trial response header",
);

const html = await pageResponse.text();
assert.match(html, /<meta[^>]+http-equiv=["']origin-trial["'][^>]*>/i, "case board must contain the origin-trial meta tag");
assert(html.includes(expectedToken), "case board must contain the exact WebMCP origin-trial token");

console.log(JSON.stringify({ ok: true, baseUrl: baseUrl.href, checks: ["health", "head", "origin-trial-header", "origin-trial-meta"] }));

