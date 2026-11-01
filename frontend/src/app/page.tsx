"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type Template } from "@/lib/api";

export default function Home() {
  const [category, setCategory] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: ({ signal }) => api<string[]>("/categories", { signal }) });
  const templates = useQuery({ queryKey: ["templates", category], queryFn: ({ signal }) => api<Template[]>(`/templates${category ? `?category=${encodeURIComponent(category)}` : ""}`, { signal }) });
  return <main className="main-shell"><section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="sparkle">✳</span> 为你的灵感留个位置</span><h1>让每一张照片，<br/><span>都有新的故事。</span></h1><p>选一个喜欢的模板，上传你的照片。<br/>那些想要留下的瞬间，就从这里开始。</p><a className="hero-link" href="#templates">探索模板 <span aria-hidden="true">↗</span></a></div><div className="hero-art" aria-hidden="true"><div className="hero-paper paper-back"><img src="/covers/collage.svg" alt="" /></div><div className="hero-paper paper-front"><img src="/covers/postcard.svg" alt="" /></div><span className="art-note">MAKE IT<br/>YOURS <b>✳</b></span></div></section>
    <section id="templates" className="gallery"><div className="section-heading"><div><span className="overline">THE TEMPLATE COLLECTION</span><h2>发现灵感 <span>✳</span></h2><p>从一张照片开始，做点有意思的事。</p></div><span className="collection-label">PICK YOUR FAVORITE ↗</span></div>
      {categories.isError ? <div className="feedback" role="alert">分类加载失败。 <button onClick={() => categories.refetch()}>重新加载</button></div> : <div className="filters" aria-label="模板分类"><button className={!category ? "selected" : ""} aria-pressed={!category} onClick={() => setCategory("")}>全部模板</button>{categories.data?.map((item) => <button key={item} className={category === item ? "selected" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}{categories.isLoading && <span className="muted">正在加载分类…</span>}</div>}
      {templates.isLoading ? <div className="feedback" role="status">正在加载模板…</div> : templates.isError ? <div className="feedback" role="alert">模板暂时加载不了，请检查连接。 <button onClick={() => templates.refetch()}>重试</button></div> : !templates.data?.length ? <div className="feedback">这个分类还没有模板，试试其他分类。</div> : <div className="template-grid">{templates.data.map((template) => <Link className="template-card" key={template.id} href={`/templates/${template.id}`}><div className="cover"><img src={template.coverUrl} alt="" /><span className="cover-action" aria-hidden="true">↗</span></div><div className="card-meta"><div><span>{template.category}</span><h3>{template.title}</h3></div><span className="count-tag">{template.requiredImageCount} 张图片</span></div></Link>)}</div>}
    </section><footer className="footer"><span>✳ 拾光素材</span><span>把日常，变成喜欢的样子。</span></footer></main>;
}
