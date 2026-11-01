// Run against a disposable Compose environment; this creates demonstration data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://frontend:3000";
const png = await readFile(new URL("./fixtures/sample.png", import.meta.url));
const headers = (user) => ({ "X-Demo-User": user });
async function create(user) {
  const form = new FormData(); form.append("file", new Blob([png], { type: "image/png" }), "sample.png");
  const uploaded = await fetch(`${base}/api/assets`, { method: "POST", headers: headers(user), body: form });
  assert.equal(uploaded.status, 201);
  const asset = await uploaded.json();
  const response = await fetch(`${base}/api/tasks`, { method: "POST", headers: { ...headers(user), "Content-Type": "application/json" }, body: JSON.stringify({ templateId: "portrait", assetIds: [asset.id] }) });
  assert.equal(response.status, 202);
  return (await response.json()).taskId;
}
const a1 = await create("demo-a");
await new Promise((resolve) => setTimeout(resolve, 20));
const a2 = await create("demo-a");
const b = await create("demo-b");
async function history(user) {
  const response = await fetch(`${base}/api/tasks`, { headers: headers(user) });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
const aTasks = await history("demo-a");
const bTasks = await history("demo-b");
assert.ok(aTasks.some((task) => task.id === a1));
assert.ok(aTasks.some((task) => task.id === a2));
assert.ok(!aTasks.some((task) => task.id === b));
assert.ok(bTasks.some((task) => task.id === b));
assert.ok(!bTasks.some((task) => task.id === a1));
assert.deepEqual(aTasks.map((task) => task.id), (await history("demo-a")).map((task) => task.id), "history order is stable");
assert.ok(aTasks.findIndex((task) => task.id === a2) < aTasks.findIndex((task) => task.id === a1));
assert.equal((await fetch(`${base}/api/tasks`, { headers: headers("invalid") })).status, 401);
console.log("history is ordered and isolated by user");
