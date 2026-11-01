"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@/components/user-provider";
import { api } from "@/lib/api";

type Task = { id: string; templateId: string; templateTitle: string; status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"; currentStage: string | null; resultUrl: string | null; failureReason: string | null; createdAt: string };
const stageNames: Record<string, string> = { MATERIAL_CHECK: "素材检查", GENERATING: "模拟生成", FINALIZING: "结果整理" };
const active = (task: Task) => task.status === "PENDING" || task.status === "RUNNING";

function HistoryCard({ initial, userId }: { initial: Task; userId: string }) {
  const query = useQuery({
    queryKey: ["private", userId, "history-task", initial.id],
    queryFn: ({ signal }) => api<Task>(`/tasks/${initial.id}`, { userId, signal }),
    initialData: initial,
    enabled: (query) => active(query.state.data ?? initial),
    staleTime: 0,
    refetchInterval: (query) => query.state.data && active(query.state.data) ? 1500 : false,
  });
  const task = query.data;
  return <article className="history-card" aria-label={`任务 ${task.id}`}>
    {task.resultUrl ? <img className="history-preview" src={task.resultUrl} alt="制作结果预览" /> : <div className="history-placeholder" aria-hidden="true">✳</div>}
    <div className="history-content"><div className="history-title"><h2>{task.templateTitle}</h2><span>{task.status === "SUCCEEDED" ? "制作完成" : task.status === "FAILED" ? "制作失败" : task.status === "RUNNING" ? "制作中" : "等待处理"}</span></div>
      <time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString("zh-CN")}</time>
      {task.currentStage && <p>当前阶段：{stageNames[task.currentStage] || task.currentStage}</p>}
      {task.failureReason && <p className="task-error">{task.failureReason}</p>}
      {query.isError && <p className="task-error" role="alert">暂时无法更新任务状态。 <button type="button" onClick={() => query.refetch()}>重新查询</button></p>}
      <small>任务编号 {task.id}</small><Link href={`/templates/${task.templateId}`}>查看模板 ↗</Link>
    </div>
  </article>;
}

export function TaskHistory() {
  const { userId } = useIdentity();
  const history = useQuery({ queryKey: ["private", userId, "tasks"], queryFn: ({ signal }) => api<Task[]>("/tasks", { userId, signal }), enabled: !!userId, staleTime: 0 });
  return <main className="history-shell"><div className="history-heading"><div><span className="overline">YOUR CREATIONS</span><h1>我的作品</h1><p>每一次制作，都在这里留下记录。</p></div><Link href="/">探索模板 ↗</Link></div>
    {!userId || history.isLoading ? <div className="feedback" role="status">正在加载作品…</div> : history.isError && !history.data ? <div className="feedback" role="alert">作品暂时加载不了。 <button onClick={() => history.refetch()}>重新加载</button></div> : !history.data?.length ? <div className="feedback">还没有作品，选择模板开始制作吧。 <Link href="/">发现模板 ↗</Link></div> : <>{history.isError && <div className="feedback" role="alert">历史列表暂时无法更新。 <button onClick={() => history.refetch()}>重新加载</button></div>}<div className="history-grid">{history.data.map((task) => <HistoryCard key={task.id} initial={task} userId={userId} />)}</div></>}
  </main>;
}
