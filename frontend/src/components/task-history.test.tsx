import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskHistory } from "./task-history";

let userId = "demo-a";
vi.mock("@/components/user-provider", () => ({ useIdentity: () => ({ userId }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); userId = "demo-a"; });
const task = (id: string, status: string) => ({ id, templateId: "portrait", templateTitle: `模板 ${id}`, status, currentStage: "GENERATING", createdAt: "2026-01-01T00:00:00Z", resultUrl: status === "SUCCEEDED" ? "/covers/postcard.svg" : null, failureReason: status === "FAILED" ? "生成失败" : null });
const wrap = () => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TaskHistory /></QueryClientProvider>;

test("restores separate tasks and preserves running state during a temporary query failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/tasks") return { ok: true, json: async () => [task("one", "RUNNING"), task("two", "SUCCEEDED")] };
    if (url.endsWith("/one") && ++attempts === 1) throw new Error("offline");
    return { ok: true, json: async () => task("one", "SUCCEEDED") };
  }));
  render(wrap());
  const first = await screen.findByRole("article", { name: "任务 one" });
  expect(within(first).getByText("制作中")).toBeInTheDocument();
  expect(await within(first).findByText(/暂时无法更新任务状态/)).toBeInTheDocument();
  expect(within(first).queryByText("制作失败")).not.toBeInTheDocument();
  expect(within(screen.getByRole("article", { name: "任务 two" })).getByText("制作完成")).toBeInTheDocument();
  fireEvent.click(within(first).getByRole("button", { name: "重新查询" }));
  await waitFor(() => expect(within(first).getByText("制作完成")).toBeInTheDocument());
});

test("stops querying a task after it reaches a terminal state", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/tasks") return { ok: true, json: async () => [task("one", "RUNNING"), task("two", "FAILED")] };
    calls++;
    return { ok: true, json: async () => task("one", "SUCCEEDED") };
  }));
  render(wrap());
  expect(await screen.findByText("制作完成")).toBeInTheDocument();
  expect(screen.getByText("制作失败")).toBeInTheDocument();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1800)); });
  expect(calls).toBe(1);
}, 6000);

test("ignores a late history response after changing users", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => {
    const user = (options.headers as Record<string, string>)["X-Demo-User"];
    if (user === "demo-a") return new Promise((resolve) => { finish = resolve; });
    return Promise.resolve({ ok: true, json: async () => [task("new", "SUCCEEDED")] });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><TaskHistory /></QueryClientProvider>);
  await waitFor(() => expect(finish).toBeDefined());
  userId = "demo-b";
  view.rerender(<QueryClientProvider client={client}><TaskHistory /></QueryClientProvider>);
  expect(await screen.findByText("模板 new")).toBeInTheDocument();
  await act(async () => { finish({ ok: true, json: async () => [task("old", "SUCCEEDED")] }); });
  expect(screen.queryByText("模板 old")).not.toBeInTheDocument();
  expect(screen.getByText("模板 new")).toBeInTheDocument();
});

test("offers a retry for history loading errors and shows an empty state", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(async () => ++calls === 1 ? { ok: false, status: 503, json: async () => ({ message: "不可用" }) } : { ok: true, json: async () => [] }));
  render(wrap());
  fireEvent.click(await screen.findByRole("button", { name: "重新加载" }));
  expect(await screen.findByText(/还没有作品/)).toBeInTheDocument();
});

test("aborts an outstanding task query when leaving the history page", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((url: string, options: RequestInit) => {
    if (url === "/api/tasks") return Promise.resolve({ ok: true, json: async () => [task("one", "RUNNING")] });
    signal = options.signal as AbortSignal;
    return new Promise(() => {});
  }));
  const view = render(wrap());
  await waitFor(() => expect(signal).toBeDefined());
  view.unmount();
  expect(signal?.aborted).toBe(true);
});

test("keeps results attached to their tasks when responses arrive out of order", async () => {
  const pending: Record<string, (value: unknown) => void> = {};
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/tasks") return Promise.resolve({ ok: true, json: async () => [task("one", "RUNNING"), task("two", "RUNNING")] });
    return new Promise((resolve) => { pending[url.split("/").pop()!] = resolve; });
  }));
  render(wrap());
  await waitFor(() => expect(Object.keys(pending)).toHaveLength(2));
  await act(async () => { pending.two({ ok: true, json: async () => task("two", "FAILED") }); });
  expect(await within(screen.getByRole("article", { name: "任务 two" })).findByText("生成失败")).toBeInTheDocument();
  await act(async () => { pending.one({ ok: true, json: async () => task("one", "SUCCEEDED") }); });
  expect(await within(screen.getByRole("article", { name: "任务 one" })).findByText("制作完成")).toBeInTheDocument();
  expect(within(screen.getByRole("article", { name: "任务 two" })).getByText("制作失败")).toBeInTheDocument();
});
