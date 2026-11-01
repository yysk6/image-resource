import type { NextRequest } from "next/server";

// The upstream address is resolved at runtime inside the server, never in the browser.
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = process.env.BACKEND_URL || "http://localhost:8080";
  const url = new URL(`/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, base);
  const headers = new Headers(request.headers);
  for (const name of ["host", "connection", "content-length", "transfer-encoding"]) headers.delete(name);
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["connection", "content-length", "content-encoding", "transfer-encoding"]) responseHeaders.delete(name);
    const body = [204, 205, 304].includes(upstream.status) ? null : upstream.body;
    return new Response(body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ code: "BACKEND_UNAVAILABLE", message: "服务暂时不可用，请稍后重试" }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
export const GET = forward;
export const POST = forward;
