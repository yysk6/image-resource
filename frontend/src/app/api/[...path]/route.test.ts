// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";
import { GET, POST } from "./route";

afterEach(() => vi.unstubAllGlobals());

test("forwards multipart bytes and user header", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const form = new FormData();
  form.append("file", new Blob(["image bytes"], { type: "image/png" }), "demo.png");
  const request = new NextRequest("http://localhost/api/assets?x=1", { method: "POST", headers: { "X-Demo-User": "demo-a" }, body: form });
  const response = await POST(request, { params: Promise.resolve({ path: ["assets"] }) });
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("http://localhost:8080/api/assets?x=1");
  expect(options.headers.get("x-demo-user")).toBe("demo-a");
  expect(options.headers.get("content-type")).toContain("multipart/form-data; boundary=");
  expect(new TextDecoder().decode(options.body)).toContain("image bytes");
  expect(response.status).toBe(201);
});

test("returns upstream image content and reports unavailable upstream", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response("image", { headers: { "content-type": "image/png" } })).mockRejectedValueOnce(new Error("offline"));
  vi.stubGlobal("fetch", fetchMock);
  const context = { params: Promise.resolve({ path: ["assets", "1", "content"] }) };
  const request = new NextRequest("http://localhost/api/assets/1/content");
  const response = await GET(request, context);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(await response.text()).toBe("image");
  expect((await GET(request, context)).status).toBe(502);
});
