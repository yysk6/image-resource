// Run only in taskscenarios disposable environment with the test templates installed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://saturated:8080";
const headers = { "X-Demo-User": "demo-a" };
const mode = process.argv[2];
if (mode === "setup") {
  const png = await readFile(new URL("./fixtures/sample.png", import.meta.url));
  const form = new FormData(); form.append("file", new Blob([png], { type: "image/png" }), "sample.png");
  const response = await fetch(`${base}/api/assets`, { method: "POST", headers, body: form });
  assert.equal(response.status, 201); console.log((await response.json()).id);
} else {
  const id = process.argv[3];
  assert.match(id, /^[0-9a-f-]{36}$/);
  async function create(templateId) {
    return fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ templateId, assetIds: [id] }) });
  }
  if (mode === "rules") {
    assert.equal((await create("test-type")).status, 400, "template MIME requirement enforced");
    assert.equal((await create("test-size")).status, 400, "template size requirement enforced");
    console.log("template type and size requirements enforced");
  } else if (mode === "missing") {
    assert.equal((await create("portrait")).status, 400, "unreadable asset rejected");
    console.log("missing asset file rejected");
  } else throw new Error("Expected setup, rules or missing");
}
