// Run against a disposable Compose database and volume; successful uploads remain as demo data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://frontend:3000";
let ready = false;
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.ok(ready, "application did not become ready");
const png = await readFile(new URL("./fixtures/sample.png", import.meta.url));
const jpeg = await readFile(new URL("./fixtures/sample.jpg", import.meta.url));
const catalog = await (await fetch(`${base}/api/templates`)).json();
assert.ok(catalog.length > 0);
for (const template of catalog) assert.equal((await fetch(`${base}${template.coverUrl}`)).status, 200, `cover for ${template.id}`);
async function upload(bytes, type, user = "demo-a") {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), "sample");
  return fetch(`${base}/api/assets`, { method: "POST", headers: { "X-Demo-User": user }, body: form });
}
for (const [data, mime] of [[png, "image/png"], [jpeg, "image/jpeg"]]) {
  const response = await upload(data, mime);
  assert.equal(response.status, 201, await response.clone().text());
  const asset = await response.json();
  assert.equal(asset.mimeType, mime);
  const own = await fetch(`${base}${asset.previewUrl}`, { headers: { "X-Demo-User": "demo-a" } });
  assert.equal(own.status, 200);
  assert.deepEqual(Buffer.from(await own.arrayBuffer()), data);
  const other = await fetch(`${base}${asset.previewUrl}`, { headers: { "X-Demo-User": "demo-b" } });
  assert.equal(other.status, 404);
  console.log(`validated ${mime}: ${asset.id}`);
}
assert.equal((await upload(png, "image/jpeg")).status, 400, "MIME mismatch rejected");
assert.equal((await upload(Buffer.from("not an image"), "image/png")).status, 400, "invalid content rejected");
assert.equal((await upload(Buffer.alloc(0), "image/png")).status, 400, "empty image rejected");
assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).status, 413, "oversized image rejected");
assert.equal((await upload(png, "image/png", "unknown")).status, 401, "unknown user rejected");
console.log("Asset integration checks passed.");
