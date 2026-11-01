"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useIdentity } from "@/components/user-provider";
import type { Template } from "@/lib/api";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type Slot = { file?: File; preview?: string; status: "empty" | "uploading" | "ready" | "error"; assetId?: string; error?: string };
const empty = (): Slot => ({ status: "empty" });
type Task = { id: string; status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"; currentStage: string | null; resultUrl: string | null; failureReason: string | null };
const stageNames: Record<string, string> = { MATERIAL_CHECK: "素材检查", GENERATING: "模拟生成", FINALIZING: "结果整理" };
function TaskCard({ id, userId }: { id: string; userId: string }) {
  const query = useQuery({
    queryKey: ["private", userId, "task", id], queryFn: ({ signal }) => api<Task>(`/tasks/${id}`, { userId, signal }),
    refetchInterval: (query) => ["PENDING", "RUNNING"].includes(query.state.data?.status ?? "") ? 1500 : false,
  });
  const task = query.data;
  return <article className="task-card" aria-label={`任务 ${id}`}><div className="task-card-header"><strong>制作任务</strong><span>{task?.status === "SUCCEEDED" ? "制作完成" : task?.status === "FAILED" ? "制作失败" : task?.status === "RUNNING" ? "制作中" : task?.status === "PENDING" ? "等待处理" : "正在获取状态"}</span></div>
    <small>任务编号 {id}</small>
    {task?.currentStage && <p>当前阶段：{stageNames[task.currentStage] || task.currentStage}</p>}
    {task?.failureReason && <p className="task-error">{task.failureReason}</p>}
    {task?.resultUrl && <img src={task.resultUrl} alt="制作结果预览" />}
    {query.isError && <p className="task-error" role="alert">暂时无法更新任务状态。 <button type="button" onClick={() => query.refetch()}>重新查询</button></p>}
  </article>;
}

function UploadSlots({ template, userId }: { template: Template; userId: string }) {
  const uploadId = useId();
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: template.requiredImageCount }, empty));
  const slotsRef = useRef(slots);
  const requests = useRef<(AbortController | undefined)[]>([]);
  const versions = useRef<number[]>([]);
  const submitRequest = useRef<AbortController | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  function update(index: number, next: Slot) {
    const copy = [...slotsRef.current];
    const previous = copy[index];
    if (previous.preview && previous.preview !== next.preview) URL.revokeObjectURL(previous.preview);
    copy[index] = next; slotsRef.current = copy; setSlots(copy);
  }
  useEffect(() => () => {
    requests.current.forEach((controller) => controller?.abort());
    submitRequest.current?.abort();
    slotsRef.current.forEach((slot) => { if (slot.preview) URL.revokeObjectURL(slot.preview); });
    versions.current = versions.current.map((version) => version + 1);
  }, []);

  async function choose(index: number, file: File) {
    requests.current[index]?.abort();
    const version = (versions.current[index] ?? 0) + 1;
    versions.current[index] = version;
    const preview = URL.createObjectURL(file);
    if (!template.acceptedMimeTypes.includes(file.type)) { update(index, { file, preview, status: "error", error: "请选择符合要求的 JPEG 或 PNG 图片" }); return; }
    if (!file.size || file.size > template.maxFileSizeBytes) { update(index, { file, preview, status: "error", error: `图片不能为空，且不能超过 ${template.maxFileSizeBytes / 1024 / 1024} MB` }); return; }
    if (!userId) { update(index, { file, preview, status: "error", error: "请先选择演示用户" }); return; }
    const controller = new AbortController(); requests.current[index] = controller;
    update(index, { file, preview, status: "uploading" });
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/assets", { method: "POST", headers: { "X-Demo-User": userId }, body: form, signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.message || "上传失败，请重试"); }
      const result: { id: string; previewUrl: string } = await response.json();
      const image = await fetch(result.previewUrl, { headers: { "X-Demo-User": userId }, signal: controller.signal });
      if (!image.ok) throw new Error("图片预览加载失败，请重试");
      const blob = await image.blob();
      if (versions.current[index] !== version || controller.signal.aborted) return;
      update(index, { file, preview: URL.createObjectURL(blob), status: "ready", assetId: result.id });
    } catch (error) {
      if (controller.signal.aborted || versions.current[index] !== version) return;
      update(index, { file, preview, status: "error", error: error instanceof Error ? error.message : "上传失败，请重试" });
    }
  }
  function remove(index: number) {
    requests.current[index]?.abort();
    versions.current[index] = (versions.current[index] ?? 0) + 1;
    update(index, empty());
  }
  const ready = slots.every((slot) => slot.status === "ready" && slot.assetId);
  async function submit() {
    if (!ready || submitting || !userId) return;
    const controller = new AbortController(); submitRequest.current = controller;
    setSubmitting(true); setSubmitError("");
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "X-Demo-User": userId, "Content-Type": "application/json" }, body: JSON.stringify({ templateId: template.id, assetIds: slots.map((slot) => slot.assetId) }), signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.message || "提交失败，请重试"); }
      const data: { taskId: string } = await response.json();
      if (!controller.signal.aborted) setTaskIds((ids) => [data.taskId, ...ids]);
    } catch (error) {
      if (!controller.signal.aborted) setSubmitError(error instanceof Error ? error.message : "提交失败，请重试");
    } finally { if (!controller.signal.aborted) setSubmitting(false); }
  }
  return <section className="uploads" aria-labelledby="upload-heading">
    <div className="upload-heading"><div><h2 id="upload-heading">上传照片</h2><p>选择 {template.requiredImageCount} 张照片，支持 JPEG、PNG。</p></div><span>{slots.filter((slot) => slot.status === "ready").length} / {template.requiredImageCount}</span></div>
    {!userId && <p className="upload-hint" role="status">请选择演示用户后上传。</p>}
    <div className="upload-grid">{slots.map((slot, index) => <div className="upload-slot" key={index}>
      {slot.preview ? <img src={slot.preview} alt={`第 ${index + 1} 张照片预览`} /> : <label htmlFor={`${uploadId}-${index}`} className={`upload-placeholder${userId ? " upload-placeholder-active" : ""}`} aria-hidden="true"><span>＋</span><small>照片 {index + 1}</small></label>}
      <label className={slot.file ? "upload-choose" : "upload-choose upload-choose-empty"}>{slot.file ? "更换" : ""}<input id={`${uploadId}-${index}`} type="file" accept={template.acceptedMimeTypes.join(",")} disabled={!userId} aria-label={`${slot.file ? "更换" : "选择"}第 ${index + 1} 张图片`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void choose(index, file); }} /></label>
      {slot.file && <button type="button" className="upload-remove" onClick={() => remove(index)} aria-label={`移除第 ${index + 1} 张图片`}>移除</button>}
      <div className="upload-status" aria-live="polite">{slot.status === "uploading" ? "上传中…" : slot.status === "ready" ? "上传完成" : slot.status === "error" ? <><span>{slot.error}</span>{slot.file && <button type="button" onClick={() => void choose(index, slot.file!)}>重试</button>}</> : "等待选择"}</div>
    </div>)}</div>
    <p className="upload-hint">{ready ? "素材已准备好，可以开始制作。" : "全部图片上传完成后即可准备制作。"}</p>
    <button type="button" className="detail-button upload-submit" disabled={!ready || submitting || !userId} onClick={() => void submit()}>{submitting ? "提交中…" : "开始制作"}</button>
    {submitError && <p className="task-error" role="alert">{submitError}</p>}
    {taskIds.map((id) => <TaskCard key={id} id={id} userId={userId} />)}
  </section>;
}

export function AssetUploader({ template }: { template: Template }) {
  const { userId } = useIdentity();
  return <UploadSlots key={`${template.id}:${userId}`} template={template} userId={userId} />;
}
