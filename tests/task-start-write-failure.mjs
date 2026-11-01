// The isolated MySQL trigger rejects RUNNING updates but permits FAILED updates.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://start-write-failure:8080";
const headers = { "X-Demo-User": "demo-a" };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ready = false;
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
  await pause(250);
}
assert.ok(ready, "start failure test service did not start");
const image = await readFile(new URL("./fixtures/sample.png", import.meta.url));
const form = new FormData();
form.append("file", new Blob([image], { type: "image/png" }), "sample.png");
const upload = await fetch(`${base}/api/assets`, { method: "POST", headers, body: form });
assert.equal(upload.status, 201);
const asset = await upload.json();
const created = await fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ templateId: "portrait", assetIds: [asset.id] }) });
assert.equal(created.status, 202);
const { taskId } = await created.json();
let task;
for (let i = 0; i < 50; i++) {
  const response = await fetch(`${base}/api/tasks/${taskId}`, { headers });
  assert.equal(response.status, 200);
  task = await response.json();
  if (task.status === "FAILED") break;
  await pause(100);
}
assert.equal(task.status, "FAILED", "a failed start must not leave the task pending");
console.log("task start write failure is recorded as FAILED");
