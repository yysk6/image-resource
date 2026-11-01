// Run after installing the test-only trigger documented in the stage 3 guide.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://reject-write-failure:8080";
const headers = { "X-Demo-User": "demo-a" };
const image = await readFile(new URL("./fixtures/sample.png", import.meta.url));
let ready = false;
for (let i = 0; i < 120; i++) { try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }
assert.ok(ready, "rejection test service did not start");
const form = new FormData(); form.append("file", new Blob([image], { type: "image/png" }), "sample.png");
const uploaded = await fetch(`${base}/api/assets`, { method: "POST", headers, body: form });
assert.equal(uploaded.status, 201); const id = (await uploaded.json()).id;
async function create() { return fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ templateId: "portrait", assetIds: [id] }) }); }
assert.equal((await create()).status, 202);
assert.equal((await create()).status, 202);
const rejected = await create();
assert.equal(rejected.status, 500, await rejected.clone().text());
assert.equal((await rejected.json()).code, "SERVER_ERROR");
console.log("rejection status write failure is not reported as accepted");
