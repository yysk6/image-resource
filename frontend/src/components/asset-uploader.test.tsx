import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AssetUploader } from "./asset-uploader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let currentUser = "demo-a";
vi.mock("@/components/user-provider", () => ({ useIdentity: () => ({ userId: currentUser }) }));
const template = { id: "postcard", title: "明信片", category: "创意", description: "", coverUrl: "", requiredImageCount: 2, acceptedMimeTypes: ["image/png"], maxFileSizeBytes: 1000 };
beforeEach(() => { currentUser = "demo-a"; vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn().mockReturnValue("blob:preview"), revokeObjectURL: vi.fn() })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("uploads two slots independently and removes an image", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/assets" ? { ok: true, json: async () => ({ id: "1", previewUrl: "/api/assets/1/content" }) } : { ok: true, blob: async () => new Blob(["image"]) }));
  render(<AssetUploader template={template} />);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
  expect(await screen.findByText("上传完成")).toBeInTheDocument();
  expect(screen.getByText("1 / 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "移除第 1 张图片" }));
  expect(screen.getByText("0 / 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "开始制作" })).toBeDisabled();
});

test("rejects invalid type and supports retry after upload failure", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ message: "上传失败" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ id: "1", previewUrl: "/content" }) }).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["image"]) });
  vi.stubGlobal("fetch", fetchMock);
  render(<AssetUploader template={template} />);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["x"], "x.txt", { type: "text/plain" })] } });
  expect(screen.getByText(/请选择符合要求/)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("更换第 1 张图片"), { target: { files: [new File(["x"], "x.png", { type: "image/png" })] } });
  expect(await screen.findByText("上传失败")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByText("上传完成")).toBeInTheDocument();
});

test("ignores a late response after user switch and releases previews", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { finish = resolve; })));
  const view = render(<AssetUploader template={template} />);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
  currentUser = "demo-b"; view.rerender(<AssetUploader template={template} />);
  finish({ ok: true, json: async () => ({ id: "old", previewUrl: "/old" }) });
  await waitFor(() => expect(screen.getByText("0 / 2")).toBeInTheDocument());
  expect(screen.queryByText("上传完成")).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});

test("uploads both positions and ignores a replaced file's late response", async () => {
  let finishOld!: (value: unknown) => void;
  vi.mocked(URL.createObjectURL).mockReset().mockReturnValueOnce("blob:old-local").mockReturnValueOnce("blob:new-local").mockReturnValueOnce("blob:new-server").mockReturnValueOnce("blob:other-local").mockReturnValueOnce("blob:other-server").mockReturnValue("blob:old-server");
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new", previewUrl: "/new" }) })
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["new"]) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "other", previewUrl: "/other" }) })
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["other"]) })
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["old"]) });
  vi.stubGlobal("fetch", fetchMock);
  render(<AssetUploader template={template} />);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["old"], "old.png", { type: "image/png" })] } });
  fireEvent.change(screen.getByLabelText("更换第 1 张图片"), { target: { files: [new File(["new"], "new.png", { type: "image/png" })] } });
  await screen.findByText("上传完成");
  fireEvent.change(screen.getByLabelText("选择第 2 张图片"), { target: { files: [new File(["other"], "other.png", { type: "image/png" })] } });
  await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
  await act(async () => { finishOld({ ok: true, json: async () => ({ id: "old", previewUrl: "/old" }) }); await new Promise((resolve) => setTimeout(resolve, 0)); });
  expect(screen.getByText("2 / 2")).toBeInTheDocument();
  expect(screen.getByAltText("第 1 张照片预览")).toHaveAttribute("src", "blob:new-server");
  expect(screen.getByAltText("第 2 张照片预览")).toHaveAttribute("src", "blob:other-server");
  expect(screen.getAllByText("上传完成")).toHaveLength(2);
});

test("ignores a late response after removing an uploading file", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["old"]) }));
  render(<AssetUploader template={template} />);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
  fireEvent.click(screen.getByRole("button", { name: "移除第 1 张图片" }));
  await act(async () => { finish({ ok: true, json: async () => ({ id: "old", previewUrl: "/old" }) }); await new Promise((resolve) => setTimeout(resolve, 0)); });
  expect(screen.getByText("0 / 2")).toBeInTheDocument();
  expect(screen.queryByAltText("第 1 张照片预览")).not.toBeInTheDocument();
  expect(screen.queryByText("上传完成")).not.toBeInTheDocument();
});

test("submits multiple tasks and shows independent results", async () => {
  let taskCount = 0;
  let assetCount = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/assets") return { ok: true, json: async () => ({ id: `asset-${++assetCount}`, previewUrl: "/content" }) };
    if (url === "/content") return { ok: true, blob: async () => new Blob(["image"]) };
    if (url === "/api/tasks" && options?.method === "POST") { const id = `task-${++taskCount}`; return { ok: true, json: async () => ({ taskId: id }) }; }
    const failed = url.endsWith("task-2");
    return { ok: true, json: async () => ({ id: url.split("/").pop(), status: failed ? "FAILED" : "SUCCEEDED", currentStage: failed ? "GENERATING" : "FINALIZING", resultUrl: failed ? null : "/covers/postcard.svg", failureReason: failed ? "模拟生成失败" : null }) };
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AssetUploader template={template} /></QueryClientProvider>);
  for (const index of [1, 2]) {
    fireEvent.change(screen.getByLabelText(`选择第 ${index} 张图片`), { target: { files: [new File(["a"], `${index}.png`, { type: "image/png" })] } });
    await waitFor(() => expect(screen.getAllByText("上传完成")).toHaveLength(index));
  }
  fireEvent.click(screen.getByRole("button", { name: "开始制作" }));
  expect(await screen.findByText("制作完成")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "开始制作" }));
  expect(await screen.findByText("制作失败")).toBeInTheDocument();
  expect(screen.getByText("模拟生成失败")).toBeInTheDocument();
  expect(screen.getByText("制作完成")).toBeInTheDocument();
});

test("keeps task information on query failure and supports recovery", async () => {
  let taskQueries = 0;
  let finishSubmit!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/assets") return { ok: true, json: async () => ({ id: "asset-1", previewUrl: "/content" }) };
    if (url === "/content") return { ok: true, blob: async () => new Blob(["image"]) };
    if (url === "/api/tasks" && options?.method === "POST") return new Promise((resolve) => { finishSubmit = resolve; });
    taskQueries++;
    if (taskQueries === 2) throw new Error("offline");
    return { ok: true, json: async () => ({ id: "task-1", status: taskQueries === 1 ? "RUNNING" : "SUCCEEDED", currentStage: "GENERATING", resultUrl: taskQueries === 1 ? null : "/covers/postcard.svg", failureReason: null }) };
  }));
  const one = { ...template, requiredImageCount: 1 };
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AssetUploader template={one} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
  await screen.findByText("上传完成");
  fireEvent.click(screen.getByRole("button", { name: "开始制作" }));
  expect(screen.getByRole("button", { name: "提交中…" })).toBeDisabled();
  await act(async () => { finishSubmit({ ok: true, json: async () => ({ taskId: "task-1" }) }); });
  expect(await screen.findByText("制作中")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/暂时无法更新任务状态/)).toBeInTheDocument(), { timeout: 4000 });
  expect(screen.getByText("制作中")).toBeInTheDocument();
  expect(screen.queryByText("制作失败")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "重新查询" }));
  expect(await screen.findByText("制作完成")).toBeInTheDocument();
});

test("stops polling after a task succeeds", async () => {
  let queries = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/assets") return { ok: true, json: async () => ({ id: "asset-1", previewUrl: "/content" }) };
    if (url === "/content") return { ok: true, blob: async () => new Blob(["image"]) };
    if (url === "/api/tasks" && options?.method === "POST") return { ok: true, json: async () => ({ taskId: "task-1" }) };
    queries++;
    return { ok: true, json: async () => ({ id: "task-1", status: queries === 1 ? "RUNNING" : "SUCCEEDED", currentStage: "FINALIZING", resultUrl: queries === 1 ? null : "/covers/postcard.svg", failureReason: null }) };
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AssetUploader template={{ ...template, requiredImageCount: 1 }} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("选择第 1 张图片"), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
  await screen.findByText("上传完成");
  fireEvent.click(screen.getByRole("button", { name: "开始制作" }));
  await waitFor(() => expect(screen.getByText("制作完成")).toBeInTheDocument(), { timeout: 4000 });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1800)); });
  expect(queries).toBe(2);
}, 8000);
