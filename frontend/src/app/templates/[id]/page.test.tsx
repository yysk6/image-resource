import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import TemplateDetail from "./page";
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "postcard" }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = () => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TemplateDetail /></QueryClientProvider>;
test("shows the template requirements from the server", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ id: "postcard", title: "旅行明信片", category: "创意图片", description: "描述", coverUrl: "/covers/postcard.svg", requiredImageCount: 2, acceptedMimeTypes: ["image/jpeg", "image/png"], maxFileSizeBytes: 5242880 }) })));
  render(wrap());
  expect(await screen.findByRole("heading", { name: "旅行明信片" })).toBeInTheDocument();
  expect(screen.getByText("2 张")).toBeInTheDocument();
  expect(screen.getByText("JPEG、PNG")).toBeInTheDocument();
});
test("shows a useful message when a template does not exist", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ message: "模板不存在" }) })));
  render(wrap());
  expect(await screen.findByText("没有找到这个模板。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "← 返回模板列表" })).toHaveAttribute("href", "/");
});
