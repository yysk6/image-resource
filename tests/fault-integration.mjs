import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const png = await readFile(new URL("./fixtures/sample.png", import.meta.url));
for (const host of ["storage-fault", "db-fault"]) {
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "sample.png");
  const response = await fetch(`http://${host}:8080/api/assets`, { method: "POST", headers: { "X-Demo-User": "demo-a" }, body: form });
  assert.equal(response.status, 500, `${host}: ${await response.clone().text()}`);
  const error = await response.json();
  assert.equal(error.code, "SERVER_ERROR");
  assert.ok(!JSON.stringify(error).includes("/app/"));
  console.log(`${host}: failed as expected`);
}
