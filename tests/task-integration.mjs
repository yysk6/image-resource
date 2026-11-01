// Uses an isolated or disposable Compose environment. Uploaded fixtures and tasks remain in it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://frontend:3000";
const png = await readFile(new URL("./fixtures/sample.png", import.meta.url));
const headers = { "X-Demo-User": "demo-a" };
for (let i = 0; i < 120; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }
async function upload() {
  const form = new FormData(); form.append("file", new Blob([png], { type: "image/png" }), "sample.png");
  const response = await fetch(`${base}/api/assets`, { method: "POST", headers, body: form });
  assert.equal(response.status, 201); return (await response.json()).id;
}
const ids = [await upload(), await upload()];
async function createTask(templateId, assetIds, user = "demo-a") {
  return fetch(`${base}/api/tasks`, { method: "POST", headers: { "X-Demo-User": user, "Content-Type": "application/json" }, body: JSON.stringify({ templateId, assetIds }) });
}
assert.equal((await createTask("postcard", [ids[0]])).status, 400, "wrong count rejected");
assert.equal((await createTask("postcard", [ids[0], ids[0]])).status, 400, "duplicate assets rejected");
assert.equal((await createTask("missing", ids)).status, 404, "missing template rejected");
assert.equal((await createTask("postcard", ids, "demo-b")).status, 404, "other user's assets rejected");
const invalidJson = await fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{" });
assert.equal(invalidJson.status, 400); assert.equal((await invalidJson.json()).code, "BAD_REQUEST");
const before = Date.now();
const created = await createTask("postcard", ids);
assert.equal(created.status, 202, await created.clone().text());
assert.ok(Date.now() - before < 3000, "request should not wait for the simulated job");
const taskId = (await created.json()).taskId;
assert.ok(taskId);
let task; const seen = [];
for (let i = 0; i < 90; i++) {
  const response = await fetch(`${base}/api/tasks/${taskId}`, { headers });
  assert.equal(response.status, 200);
  task = await response.json();
  if (task.currentStage && !seen.includes(task.currentStage)) seen.push(task.currentStage);
  if (["SUCCEEDED", "FAILED"].includes(task.status)) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.equal(task.status, "SUCCEEDED", JSON.stringify(task));
assert.deepEqual(seen, ["MATERIAL_CHECK", "GENERATING", "FINALIZING"]);
assert.ok(task.resultUrl);
assert.equal((await fetch(`${base}${task.resultUrl}`)).status, 200);
assert.equal((await fetch(`${base}/api/tasks/${taskId}`, { headers: { "X-Demo-User": "demo-b" } })).status, 404);
assert.equal((await (await fetch(`${base}/api/tasks/${taskId}`, { headers })).json()).status, "SUCCEEDED");
console.log(`task completed and remains terminal: ${taskId}`);
