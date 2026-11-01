import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Providers } from "@/components/user-provider";
import Home from "./page";
import { useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/components/user-provider";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
test("loads templates, filters categories, and switches demo users", async () => {
  const item = { id: "one", title: "旅行明信片", category: "创意图片", coverUrl: "/covers/postcard.svg", requiredImageCount: 2 };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/users" ? [{ id: "demo-a", displayName: "演示用户 A" }, { id: "demo-b", displayName: "演示用户 B" }] : url === "/api/categories" ? ["创意图片"] : url.includes("category=") ? [] : [item] })));
  render(<Providers><Home /></Providers>);
  expect(await screen.findByRole("link", { name: /旅行明信片/ })).toHaveAttribute("href", "/templates/one");
  fireEvent.click(await screen.findByRole("button", { name: "创意图片" }));
  expect(await screen.findByText(/这个分类还没有模板/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("切换演示用户")).toHaveValue("demo-a"));
  fireEvent.change(screen.getByLabelText("切换演示用户"), { target: { value: "demo-b" } });
  expect(localStorage.getItem("demo-user")).toBe("demo-b");
});
test("shows a retry when templates cannot load", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/templates" ? { ok: false, status: 503, json: async () => ({ message: "不可用" }) } : { ok: true, json: async () => [] }));
  render(<Providers><Home /></Providers>);
  expect(await screen.findByText(/模板暂时加载不了/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
});
test("offers a retry when the user list is empty", async () => {
  const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/users" && fetchMock.mock.calls.filter(([path]) => path === "/api/users").length > 1 ? [{ id: "demo-a", displayName: "演示用户 A" }] : [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<Providers><Home /></Providers>);
  fireEvent.click(await screen.findByRole("button", { name: "暂无演示用户，重新加载" }));
  await waitFor(() => expect(screen.getByLabelText("切换演示用户")).toHaveValue("demo-a"));
});
test("clears the previous identity when a refreshed user list is empty", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/users" && ++calls === 1 ? [{ id: "demo-a", displayName: "演示用户 A" }] : [] })));
  function Probe() {
    const client = useQueryClient(); const { userId } = useIdentity();
    return <><span data-testid="identity">{userId || "none"}</span><button onClick={() => client.invalidateQueries({ queryKey: ["users"] })}>刷新用户</button></>;
  }
  render(<Providers><Probe /></Providers>);
  await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("demo-a"));
  fireEvent.click(screen.getByRole("button", { name: "刷新用户" }));
  await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("none"));
  expect(screen.getByRole("button", { name: "暂无演示用户，重新加载" })).toBeInTheDocument();
});
