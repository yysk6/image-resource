import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const image = await readFile(new URL("./fixtures/sample.png", import.meta.url));
const headers = { "X-Demo-User": "demo-a" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready(base) {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await sleep(250); }
  throw new Error(`${base} did not start`);
}
async function asset(base) {
  const form = new FormData(); form.append("file", new Blob([image], { type: "image/png" }), "sample.png");
  const response = await fetch(`${base}/api/assets`, { method: "POST", headers, body: form });
  assert.equal(response.status, 201, await response.clone().text()); return (await response.json()).id;
}
async function create(base, id) {
  return fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ templateId: "portrait", assetIds: [id] }) });
}
async function get(base, id) {
  const response = await fetch(`${base}/api/tasks/${id}`, { headers });
  assert.equal(response.status, 200); return response.json();
}
for (const [host, stages] of [["fail-material", ["MATERIAL_CHECK"]], ["fail-generate", ["MATERIAL_CHECK", "GENERATING"]], ["fail-finalize", ["MATERIAL_CHECK", "GENERATING", "FINALIZING"]]]) {
  const base = `http://${host}:8080`; await ready(base);
  const response = await create(base, await asset(base)); assert.equal(response.status, 202);
  const id = (await response.json()).taskId; const seen = [];
  let task;
  for (let i = 0; i < 160; i++) { task = await get(base, id); if (task.currentStage && !seen.includes(task.currentStage)) seen.push(task.currentStage); if (task.status === "FAILED") break; await sleep(50); }
  assert.equal(task.status, "FAILED", JSON.stringify(task));
  assert.deepEqual(seen, stages);
  assert.equal(task.currentStage, stages.at(-1)); assert.ok(task.failureReason);
  assert.equal((await get(base, id)).status, "FAILED");
  console.log(`${host}: ${seen.join(" → ")} → FAILED`);
}
const base = "http://saturated:8080"; await ready(base);
const id = await asset(base);
const first = await create(base, id); const second = await create(base, id); const third = await create(base, id);
assert.equal(first.status, 202); assert.equal(second.status, 202); assert.equal(third.status, 503);
const rejected = await third.json(); assert.equal(rejected.code, "BUSY"); assert.equal(rejected.status, "FAILED");
const failed = await get(base, rejected.taskId); assert.equal(failed.status, "FAILED"); assert.ok(failed.failureReason);
console.log("saturated: rejected task is persisted as FAILED");
