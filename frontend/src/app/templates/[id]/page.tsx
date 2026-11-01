"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type Template } from "@/lib/api";

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const template = useQuery({ queryKey: ["template", id], queryFn: ({ signal }) => api<Template>(`/templates/${encodeURIComponent(id)}`, { signal }) });
  return <main className="detail-shell"><Link href="/" className="back-link">← 返回模板列表</Link>{template.isLoading ? <div className="feedback" role="status">正在加载模板…</div> : template.isError ? <div className="feedback" role="alert">{template.error instanceof ApiError && template.error.status === 404 ? "没有找到这个模板。" : "模板暂时加载不了，请检查连接。"} {!(template.error instanceof ApiError && template.error.status === 404) && <button onClick={() => template.refetch()}>重试</button>}</div> : template.data && <div className="detail-grid"><div className="detail-cover"><img src={template.data.coverUrl} alt={`${template.data.title}模板示例`} /></div><div className="detail-copy"><span className="overline">{template.data.category} / TEMPLATE</span><h1>{template.data.title}</h1><p className="description">{template.data.description}</p><div className="requirements"><h2>素材要求</h2><div><span>需要图片</span><strong>{template.data.requiredImageCount} 张</strong></div><div><span>图片格式</span><strong>{template.data.acceptedMimeTypes.map((type) => type.replace("image/", "").toUpperCase()).join("、")}</strong></div><div><span>单张大小</span><strong>不超过 {template.data.maxFileSizeBytes / 1024 / 1024} MB</strong></div></div><div className="stage-note">图片上传和制作功能即将开放。</div><Link href="/" className="detail-button">继续浏览模板 <span>↗</span></Link></div></div>}</main>;
}
